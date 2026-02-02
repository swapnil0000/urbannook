import { v4 as uuidv4 } from "uuid";

export const setUserIdForUpload = (req, res, next) => {
  let userId = req.query.userId || req.headers["x-user-id"];

  if (!userId) {
    // First-time: generate new userId
    userId = uuidv4();
    // console.log("Generated new UserID for first-time upload:", userId);
    
    // Optionally: set in response header so client browser me store kar sake
    res.setHeader("x-user-id", userId);
  }

  req.userIdForUpload = userId;
  next();
};
