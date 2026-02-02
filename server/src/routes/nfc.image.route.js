import { Router } from "express";
import uploadImgWithMulterToNfcBucket from "../middleware/nfcImageUpload.js";
import {
  nfcFirstTimeTakeImageFromUserController,
  nfcUpdateImagesController,
} from "../controller/nfc.image.controller.js";
import { setUserIdForUpload } from "../middleware/setUserIdForUpload.js";

const nfcRouter = Router();

// First-time upload
nfcRouter.post(
  "/nfc/upload-images",
  setUserIdForUpload,
  uploadImgWithMulterToNfcBucket.array("images", 4),
  nfcFirstTimeTakeImageFromUserController,
);

// Update selected images
nfcRouter.post(
  "/nfc/update-images",
  setUserIdForUpload,
  uploadImgWithMulterToNfcBucket.array("images", 4),
  nfcUpdateImagesController,
);

export default nfcRouter;
