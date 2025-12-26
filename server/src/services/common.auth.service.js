import { ApiError, ApiRes } from "../utlis/index.js";
import Admin from "../model/admin.model.js";
import User from "../model/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cookieOptions from "../config/config.js";
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
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        return res
          .status(401)
          .json(new ApiError(401, "Auth Bearer Header Missing", null, false));
      }
      const token = authHeader.split(" ")[1];
      const secret =
        role === "Admin"
          ? process.env.ADMIN_ACCESS_TOKEN_SECRET
          : process.env.USER_ACCESS_TOKEN_SECRET;
      if (!secret) {
        throw new Error("JWT secret missing in env");
      }
      const decodedToken = jwt.verify(token, secret);

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
          new ApiError(401, "Access Token Expired or Malformed", null, false)
        );
    }
  };
};

const logoutService = async (req, res) => {
  const { userEmail } = req.user;
  console.log(userEmail);
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

  return res
    .clearCookie("userRefreshToken", cookieOptions)
    .status(200)
    .json(new ApiRes(200, "User Logout Successfully", null, true));
};

const profileFetchService = async (data) => {
  if (!data?.userEmail)
    return res
      .status(400)
      .json(new ApiError(400, `userEmail not avaialable`, [], false));
  const Model = data?.role === "Admin" ? Admin : User;
  const profile = await Model.findOne({ userEmail: data?.userEmail }).select(
    "-_id -userPassword -createdAt -updatedAt -__v"
  );
  return profile;
};

const regenerateToken = async (req, res) => {
  const { userEmail } = req.user;
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
  const tokenName =
    req.authRole == "User" ? `userRefreshToken` : `adminRefreshToken`;
  const accessToken = await Model.userRefreshToken();

  Model.userRefreshToken = accessToken;
  await res.save();
  const roleDetails = await Model.findOneAndUpdate(
    { userEmail },
    {
      $set: {
        tokenName,
      },
    },
    {
      new: true,
    }
  );
  if (!roleDetails) {
    return res
      .status(404)
      .json(new ApiError(401, ` User - can't find userEmail`, null, false));
  }
  return res
    .status(200)
    .json(
      new ApiRes(
        200,
        ` ${tokenName} generated for ${roleDetails?.role}  `,
        null,
        false
      )
    );
};
export { authGuard, logoutService, profileFetchService, regenerateToken };
