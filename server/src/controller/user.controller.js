import { validateUserInput } from "../utlis/ValidateRes.js";
import { ApiError, ApiRes } from "../utlis/index.js";
import User from "../model/user.model.js";
import {
  loginService,
  registerService,
} from "../services/user.auth.service.js";
import cookieOptions from "../config/config.js";
import {
  profileFetchService,
  resetPasswordService,
} from "../services/common.auth.service.js";
import bcrypt from "bcrypt";
const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    // field Missing , existing User and pass check
    let result = await loginService(email, password);
    if (result?.statusCode >= 400) {
      return res.status(Number(result?.statusCode)).json(result);
    }
    return res
      .status(Number(result?.statusCode))
      .cookie("userAccessToken", result?.data?.userAccessToken, cookieOptions)
      .json(
        new ApiRes(Number(result?.statusCode), `User Details`, {
          role: result?.data?.role,
          name: result?.data?.name,
          email: result?.data?.email,
          userMobileNumber: result?.data?.mobileNumber,
          userAccessToken: result?.data?.userAccessToken,
        }),
        true,
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, null, `Internal Server Error -${error}`, false));
  }
};

const userRegister = async (req, res) => {
  try {
    const { name, email, password, mobileNumber } = req.body || {};
    //fieldMissing and existing User check
    let result = await registerService(name, email, password, mobileNumber);

    if (result?.statusCode >= 400) {
      return res.status(Number(result?.statusCode)).json(result);
    }

    return res
      .status(201)
      .cookie("userAccessToken", result?.data?.userAccessToken, cookieOptions)
      .json(
        new ApiRes(
          200,
          `User created with ${email}`,
          { email, userAccessToken: result?.data?.userAccessToken },
          true,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const userDetails = await profileFetchService({ userId, role: "USER" });
    if (!userDetails) {
      return res
        .status(404)
        .json(new ApiError(404, "User not found", null, false));
    }
    return res
      .status(200)
      .json(new ApiRes(200, `User Details`, userDetails, true));
  } catch (error) {
    return res.status(500).json(new ApiError(500, error.message, null, false));
  }
};

const userForgetpassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!password) {
      return {
        statusCode: 400,
        message: `Password can't be empty`,
        data: null,
        success: false,
      };
    }
    const userDetails = await User.findOne({
      email,
    });
    const passCheck = (await userDetails.passCheck(password)) ? true : false;
    const oldPassAndNewPassCompare = await bcrypt.compare(
      password,
      userDetails?.password,
    );
    if (passCheck) {
      if (oldPassAndNewPassCompare)
        return res
          .status(400)
          .json(
            new ApiRes(
              400,
              `Current password and New password is same for user - ${email}`,
              email,
              false,
            ),
          );
    }

    if (!userDetails?._id) {
      return res
        .status(Number(400))
        .json(new ApiError(400, `Unable to reset password`, null, false));
    }
    userDetails.password = password;
    await userDetails.save(); // using this because while using findOne it doesn't trigger pre middleware and hence plain text saved
    return res
      .status(Number(200))
      .json(
        new ApiRes(
          200,
          `password updated successfully for user ${email}`,
          email,
          true,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userResetPassword = async (req, res) => {
  try {
    const { userId } = req.user;
    const { currentPassword, newPassword } = req.body || {};
    const resetPasswordSeviceValidation = await resetPasswordService(
      userId,
      currentPassword,
      newPassword,
    );
    if (!resetPasswordSeviceValidation?.success) {
      return res
        .status(Number(resetPasswordSeviceValidation?.statusCode))
        .json(
          new ApiError(
            resetPasswordSeviceValidation?.statusCode,
            resetPasswordSeviceValidation?.message,
            resetPasswordSeviceValidation?.data,
            resetPasswordSeviceValidation?.success,
          ),
        );
    }
    return res
      .status(Number(resetPasswordSeviceValidation?.statusCode))
      .json(
        new ApiRes(
          resetPasswordSeviceValidation?.statusCode,
          resetPasswordSeviceValidation?.message,
          resetPasswordSeviceValidation?.data,
          resetPasswordSeviceValidation?.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userUpdateProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    if (!userId) {
      return res
        .status(401)
        .json(new ApiError(401, "Unauthorized", null, false));
    }

    const { email, name, mobileNumber } = req.body || {};
    if (
      name === undefined &&
      mobileNumber == undefined &&
      email === undefined
    ) {
      return res
        .status(400)
        .json(new ApiError(400, "No fields provided for update", null, false));
    }

    const validate = validateUserInput({
      name,
      mobileNumber,
    });

    if (!validate.success) {
      return res
        .status(validate.statusCode)
        .json(
          new ApiError(
            validate.statusCode,
            validate.message,
            validate.data,
            false,
          ),
        );
    }

    const updateFields = {};
    if (email !== undefined) updateFields.email = email;

    if (name !== undefined) updateFields.name = name;
    if (mobileNumber !== undefined) updateFields.mobileNumber = mobileNumber;
    const updatedUser = await User.findOneAndUpdate(
      {
        userId,
        $or: [
          email !== undefined ? { email: { $ne: email } } : null,
          name != undefined ? { name: { $ne: name } } : null,
          mobileNumber != undefined
            ? { mobileNumber: { $ne: mobileNumber } }
            : null,
        ],
      },
      {
        $set: updateFields,
      },
      {
        new: true,
      },
    );

    if (!updatedUser) {
      return res
        .status(200)
        .json(
          new ApiRes(
            200,
            "No changes done. Same values already saved.",
            null,
            true,
          ),
        );
    }
    return res.status(200).json(
      new ApiRes(
        200,
        "Profile updated successfully",
        {
          email: updatedUser.email,
          name: updatedUser.name,
          mobileNumber: updatedUser.mobileNumber,
        },
        true,
      ),
    );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          `Internal Server Error - ${error.message}`,
          null,
          false,
        ),
      );
  }
};

const userAccountDeletePreview = async (req, res) => {
  try {
    const { userId } = req.user;
    if (!userId) {
      return res
        .status(400)
        .json(new ApiError(400, `Unauthorized`, null, false));
    }

    const userDetails = await User.findOne({ userId });
    if (!userDetails) {
      return res
        .status(404)
        .json(new ApiError(404, "User not found", null, false));
    }

    // Updated to jwt from Base64
    const confirmToken = jwt.sign(
      { email, purpose: "account_deletion", timestamp: Date.now() },
      process.env.DELETION_TOKEN_SECRET,
      { expiresIn: "15m" },
    );

    return res.status(200).json(
      new ApiRes(
        200,
        "Are you sure you want to delete your account?",
        {
          email,
          confirmToken,
          confirmDelete: true,
          note: "Send this token with confirmDelete=true to delete account",
        },
        true,
      ),
    );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userAccountDeleteConfirm = async (req, res) => {
  const { confirmToken, confirmDelete } = req.body;

  if (!confirmToken || confirmDelete !== true) {
    return res
      .status(400)
      .json(
        new ApiError(
          400,
          `confirmToken and confirmDelete=true are required for deleting`,
          null,
          false,
        ),
      );
  }

  try {
    // Decode token to get email
    const email = Buffer.from(confirmToken, "base64").toString("utf-8");

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json(new ApiError(404, "User not found", null, false));
    }

    // Delete user
    await User.deleteOne({ email });

    return res
      .status(200)
      .json(new ApiRes(200, "User account deleted successfully", null, true));
  } catch (err) {
    return res
      .status(500)
      .json(new ApiError(500, "Internal server error", err, false));
  }
};

export {
  userLogin,
  userRegister,
  userProfile,
  userAccountDeletePreview,
  userAccountDeleteConfirm,
  userResetPassword,
  userUpdateProfile,
  userForgetpassword,
};
