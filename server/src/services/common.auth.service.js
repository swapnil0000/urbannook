import { ApiError, ApiRes } from "../utlis/index.js";
import Admin from "../model/admin.model.js";
import User from "../model/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});
const authGuard = (role) => {
  /* The return is placed outside the try–catch because jwt.verify() runs
     during request execution, while a try–catch outside the middleware
     would only apply at function creation time, not at runtime.
 */
  return (req, res, next) => {
    try {
      const token =
        role === "Admin"
          ? req.cookies?.adminAccessToken
          : req.cookies?.userAccessToken;
      if (!token) {
        return res
          .status(401)
          .json(new ApiError(401, "Token Not Available", null, false));
      }
      const adminSecretToken = process.env.ADMIN_ACCESS_TOKEN_SECRET;
      const userSecretToken = process.env.USER_ACCESS_TOKEN_SECRET;
      const decodedToken = jwt.verify(
        token,
        role == "Admin" ? adminSecretToken : userSecretToken
      );
      /* The verified user data is attached to the request object here,
       so that all subsequent middlewares and controllers can identify
       the authenticated user without re-verifying the token again on any controller or route. */
      req.user = decodedToken;
      req.authRole = role;
      next();
    } catch (error) {
      console.error("JWT Error:", error.message);
      return res
        .status(401)
        .json(
          new ApiError(401, "Bad Token - Modified or Expired", null, false)
        );
    }
  };
};

const logoutService = async (req, res) => {
  const { userEmail } = req.body;
  const Model = req.authRole == "User" ? User : Admin;
  const roleDetails = await Model.findOne({ userEmail });

  if (!roleDetails) {
    return res
      .status(400)
      .json(new ApiError(400, `UserId not avaialable`, [], false));
  }
  await Model.findByIdAndUpdate(
    roleDetails?._id,
    {
      $unset: {
        userRefreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  return (
    res
      // .clearCookie("userAccessToken", cookieOptions)
      .status(200)
      .json(new ApiRes(200, "User Logout Successfully", null, true))
  );
};

const profileFetchService = async (data) => {
  if (!data?.userEmail)
    return res
      .status(400)
      .json(new ApiError(400, `UserId not avaialable`, [], false));
  const Model = data?.role === "Admin" ? Admin : User;
  const profile = await Model.findOne({ userEmail: data?.userEmail }).select(
    "-_id -userPassword -createdAt -updatedAt -__v"
  );
  return profile;
};

const regenerateToken = async (req, res) => {
  const { userEmail } = req.body;
  if (!userEmail) {
    return res
      .status(401)
      .json(
        new ApiError(
          401,
          `Unauthorized User - can't find userEmail`,
          null,
          false
        )
      );
  }

  const Model = req.authRole == "User" ? User : Admin;
  const roleDetails = await Model.findOne({ userEmail });
  console.log(roleDetails);
};
export { authGuard, logoutService, profileFetchService, regenerateToken };
