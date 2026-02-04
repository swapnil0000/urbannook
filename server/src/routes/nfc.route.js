import { Router } from "express";
import uploadImgWithMulterToNfcBucket from "../middleware/nfcImageUpload.js";
import {
  nfcUpsertController,
  nfcGetController,
} from "../controller/nfc.image.controller.js";

const nfcRouter = Router();

nfcRouter.post(
  "/nfc/upload/:userId",
  uploadImgWithMulterToNfcBucket.array("images", 3), // Max 3 files allowed
  nfcUpsertController,
);

nfcRouter.get(
  "/nfc/data/:userId",
  uploadImgWithMulterToNfcBucket.array("images", 3),
  nfcGetController,
);

export default nfcRouter;
