import nfcImage from "../model/nfc.image.model.js";
import { v7 as uuidv7 } from "uuid";
import bcrypt from "bcrypt";
import { 
  ValidationError, 
  NotFoundError, 
  AuthenticationError,
  InternalServerError 
} from "../utils/errors.js";

const validatePassword = async (userDoc, inputPassword) => {
  if (!userDoc) return false;
  const isMatch = await bcrypt.compare(inputPassword, userDoc.password);
  return isMatch;
};

/* Admin NFC routes start */

const nfcGenrateUserIdService = async ({ adminEmail }) => {
  if (!adminEmail) {
    throw new AuthenticationError("Unauthorized");
  }

  // generate userUuid v7
  const genratedUserUuidV7 = uuidv7();
  if (!genratedUserUuidV7) {
    throw new InternalServerError("Failed to generate user uuid v7");
  }

  // save to nfc Imgae Db
  const nfcImageRes = await nfcImage.create({
    userId: genratedUserUuidV7,
    status: "CREATED",
    isAssigned: false,
    password: process.env.DEFAULT_NFC_USER_PASSWORD,
  });
  
  const updatedNfcImageList = await nfcImage
    .find()
    .select("-_id -__v -uploadedImagesUrl");

  return {
    statusCode: 200,
    message: `New generated userId - ${nfcImageRes?.userId}, isAssigned - ${nfcImageRes?.isAssigned}`,
    data: {
      updatedList: updatedNfcImageList,
    },
    success: true,
  };
};

const nfcAssignGeneratedUserIdService = async ({ adminEmail, userId }) => {
  if (!adminEmail) {
    throw new AuthenticationError("Unauthorized");
  }

  if (!userId) {
    throw new ValidationError("no userId found to assign");
  }

  const genratedUserUuidV7 = await nfcImage.findOneAndUpdate(
    { userId },
    {
      status: "EMPTY",
      isAssigned: true,
    },
  );

  if (!genratedUserUuidV7) {
    throw new NotFoundError(`Failed to update user uuid v7 - ${genratedUserUuidV7}`);
  }

  return {
    statusCode: 200,
    message: `Result updated - ${genratedUserUuidV7} is good to go for use`,
    data: {
      userId,
      isAssigned: genratedUserUuidV7?.isAssigned,
    },
    success: true,
  };
};

const nfcPauseGeneratedUserIdService = async ({ adminEmail, userId }) => {
  if (!adminEmail) {
    throw new AuthenticationError("Unauthorized");
  }

  if (!userId) {
    throw new ValidationError("no userId found to assign");
  }

  const genratedUserUuidV7 = await nfcImage.findOneAndUpdate(
    { userId },
    {
      status: "CREATED",
      isAssigned: false,
    },
  );

  if (!genratedUserUuidV7) {
    throw new NotFoundError(`Failed to update user uuid v7 - ${genratedUserUuidV7}`);
  }

  return {
    statusCode: 200,
    message: `Result updated - ${userId} is paused`,
    data: {
      userId,
      isAssigned: genratedUserUuidV7?.isAssigned,
    },
    success: true,
  };
};
/* Admin NFC routes end */

/* Public NFC routes start */

const nfcGetUploadedDataService = async ({ userId }) => {
  if (!userId) {
    throw new ValidationError("User ID is required to get data");
  }

  const userDoc = await nfcImage.findOne({ userId });
  const cdnBaseUrl = process.env.AWS_CDN_BASE_URL;

  // If user doesn't exist (First time scan), then we return Empty Template
  // for preventing 404 errors on the frontend for new users.
  if (!userDoc) {
    return {
      statusCode: 200, // Success status because "No Data" is a valid state for new users
      message: "New user found, return empty template",
      data: {
        userId,
        uploadedImagesUrl: [null, null, null],
        text1: "",
        text2: "",
      },
      success: true,
    };
  }

  if (userDoc && !userDoc?.isAssigned) {
    return {
      statusCode: 200,
      message: `Can't display details - UserId - ${userId} is paused - Contact our Admin`,
      data: {
        userId: userDoc?.userId,
        isAssigned: userDoc?.isAssigned,
      },
      success: true,
    };
  }

  const formattedImages = userDoc.uploadedImagesUrl.map((path) =>
    path ? `${cdnBaseUrl}/${path}` : null,
  );
  
  return {
    statusCode: 200,
    message: "Data fetched successfully",
    data: {
      userId: userDoc?.userId,
      uploadedImagesUrl: `${formattedImages}`,
      uploadedText: userDoc?.uploadedText,
    },
    success: true,
  };
};

// --- UPDATED UPSERT SERVICE ---
const nfcUpsertService = async ({
  userId,
  files,
  text1,
  text2,
  indices,
  password,
}) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized: User ID is required");
  }

  // 1. Find User Doc First
  let userDoc = await nfcImage.findOne({ userId });

  // 2. SECURITY CHECK: Verify Password
  if (userDoc) {
    if (!password) {
      throw new AuthenticationError("Password is required to save changes.");
    }

    const isPasswordValid = await validatePassword(userDoc, password);

    if (!isPasswordValid) {
      throw new AuthenticationError("Incorrect Password. Please try again.");
    }
  }

  // Validation: Min 1 change required
  const hasFiles = files && files.length > 0;
  const hasTextUpdate = text1 !== undefined || text2 !== undefined;

  if (!hasFiles && !hasTextUpdate) {
    throw new ValidationError(
      "No changes detected. Please upload at least 1 image or update text."
    );
  }

  const cdnBaseUrl = process.env.AWS_CDN_BASE_URL;

  // Initialize if new
  if (!userDoc && userDoc?.isAssigned) {
    userDoc = new nfcImage({
      userId,
      uploadedImagesUrl: [null, null, null],
      text1: "",
      text2: "",
    });
  }

  let currentImages = userDoc?.uploadedImagesUrl || [null, null, null];
  while (currentImages.length < 3) currentImages.push(null);

  if (hasFiles) {
    if (indices && indices.length === files.length) {
      files.forEach((file, i) => {
        const targetIndex = parseInt(indices[i]);
        if (!isNaN(targetIndex) && targetIndex >= 0 && targetIndex < 3) {
          currentImages[targetIndex] = `${file.key}`;
        }
      });
    } else {
      files.forEach((file, i) => {
        if (i < 3) currentImages[i] = `${file.key}`;
      });
    }
  }

  if (text1 !== undefined && text1 !== "undefined") userDoc.text1 = text1;
  if (text2 !== undefined && text2 !== "undefined") userDoc.text2 = text2;

  userDoc.uploadedImagesUrl = currentImages;
  userDoc.uploadedText = [text1, text2];
  userDoc.status = "UPLOADED";

  const savedDoc = await userDoc.save();
  const formattedImages = savedDoc.uploadedImagesUrl.map((path) =>
    path ? `${cdnBaseUrl}/${path}` : null,
  );

  return {
    statusCode: 200,
    success: true,
    message: "Scrapbook updated successfully",
    data: {
      userId: savedDoc.userId,
      uploadedImagesUrl: `${formattedImages}`,
      text1: savedDoc.text1,
      text2: savedDoc.text2,
    },
  };
};

/* Public NFC routes end */

/* Change Password */
const nfcChangeUserPasswordService = async ({ userId, password, newPass }) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized: User ID is required");
  }

  const userDoc = await nfcImage.findOne({ userId });
  if (!userDoc) {
    throw new NotFoundError("User not found");
  }

  // REUSED: Common Password Validator
  const isMatch = await validatePassword(userDoc, password);

  if (!isMatch) {
    throw new AuthenticationError("Incorrect current password");
  }

  // Prevent reusing the exact same password (optional but good practice)
  const isSameAsOld = await bcrypt.compare(newPass, userDoc.password);
  if (isSameAsOld) {
    throw new ValidationError("New password cannot be the same as the old password");
  }

  userDoc.password = newPass;
  await userDoc.save();

  return {
    statusCode: 200,
    message: `Password updated successfully`,
    data: userId,
    success: true,
  };
};

export {
  nfcGenrateUserIdService,
  nfcAssignGeneratedUserIdService,
  nfcPauseGeneratedUserIdService,
  nfcGetUploadedDataService,
  nfcUpsertService,
  nfcChangeUserPasswordService,
};
