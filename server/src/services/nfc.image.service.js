import nfcImage from "../model/nfc.image.model.js";
import { v7 as uuidv7 } from "uuid";

/* Admin NFC routes start */

const nfcGenrateUserIdService = async ({ adminEmail }) => {
  if (!adminEmail) {
    return {
      statusCode: 401,
      message: "Unauthorized",
      data: null,
      success: false,
    };
  }

  // generate userUuid v7
  const genratedUserUuidV7 = uuidv7();
  if (!genratedUserUuidV7) {
    return {
      statusCode: 404,
      message: `Failed to generate user uuid v7`,
      data: null,
      success: false,
    };
  }

  // save to nfc Imgae Db

  const nfcImageRes = await nfcImage.create({
    userId: genratedUserUuidV7,
    status: "CREATED",
    isAssigned: false,
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
    return {
      statusCode: 401,
      message: "Unauthorized",
      data: null,
      success: false,
    };
  }

  if (!userId) {
    return {
      statusCode: 401,
      message: "no userId found to assign",
      data: null,
      success: false,
    };
  }

  const genratedUserUuidV7 = await nfcImage.findOneAndUpdate(
    { userId },
    {
      status: "EMPTY",
      isAssigned: true,
    },
  );

  if (!genratedUserUuidV7) {
    return {
      statusCode: 404,
      message: `Failed to update user uuid v7 - ${genratedUserUuidV7}`,
      data: null,
      success: false,
    };
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
    return {
      statusCode: 401,
      message: "Unauthorized",
      data: null,
      success: false,
    };
  }

  if (!userId) {
    return {
      statusCode: 401,
      message: "no userId found to assign",
      data: null,
      success: false,
    };
  }

  const genratedUserUuidV7 = await nfcImage.findOneAndUpdate(
    { userId },
    {
      status: "CREATED",
      isAssigned: false,
    },
  );

  if (!genratedUserUuidV7) {
    return {
      statusCode: 404,
      message: `Failed to update user uuid v7 - ${genratedUserUuidV7}`,
      data: null,
      success: false,
    };
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
    return {
      statusCode: 401,
      message: "User ID is required to get data",
      data: null,
      success: false,
    };
  }

  // Find User Data
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

const nfcUpsertService = async ({ userId, files, text1, text2, indices }) => {
  if (!userId) {
    return {
      statusCode: 401,
      success: false,
      message: "Unauthorized: User ID is required",
      data: null,
    };
  }

  // Validation: Min 1 change required
  const hasFiles = files && files.length > 0;
  const hasTextUpdate = text1 !== undefined || text2 !== undefined;

  if (!hasFiles && !hasTextUpdate) {
    return {
      statusCode: 400,
      success: false,
      message:
        "No changes detected. Please upload at least 1 image or update text.",
      data: null,
    };
  }

  const cdnBaseUrl = process.env.AWS_CDN_BASE_URL;

  let userDoc = await nfcImage.findOne({ userId });

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
    }

    // Bulk Update / First Time (Sequential)
    else {
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

export {
  nfcGenrateUserIdService,
  nfcAssignGeneratedUserIdService,
  nfcPauseGeneratedUserIdService,
  nfcGetUploadedDataService,
  nfcUpsertService,
};
