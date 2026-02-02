import { ApiError, ApiRes } from "../utlis/index.js";
import { nfcImageService, updateImagesService } from "../services/nfc.image.service.js";

// FIRST-TIME IMAGE UPLOAD
const nfcFirstTimeTakeImageFromUserController = async (req, res) => {
  try {
    const userId = req.userIdForUpload;
    const imgUrls = req.files;

    const result = await nfcImageService({ userId, imgUrls });

    if (!result.success) {
      return res.status(result.statusCode).json(
        new ApiError(result.statusCode, result.message, result.data, result.success)
      );
    }

    return res.status(result.statusCode).json(
      new ApiRes(result.statusCode, result.message, {
        userId,
        uploadedImages: result.data.uploadedImagesUrl,
      }, result.success)
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(new ApiError(500, "Image upload failed", null, false));
  }
};

// UPDATE SELECTIVE IMAGES
const nfcUpdateImagesController = async (req, res) => {
  try {
    const userId = req.userIdForUpload;
    const files = req.files;

    if (!files || files.length === 0) throw new Error("No images uploaded");

    const updates = files.map((file, idx) => ({ index: idx, file }));

    const updatedDoc = await updateImagesService({ userId, updates });

    if (!updatedDoc) {
      return res.status(404).json({
        message: "User not found. Please upload images first.",
      });
    }

    return res.status(200).json(
      new ApiRes(200, "Images updated successfully", {
        userId,
        uploadedImages: updatedDoc.uploadedImagesUrl,
      }, true)
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(
      new ApiError(500, error.message || "Image update failed", null, false)
    );
  }
};

export { nfcFirstTimeTakeImageFromUserController, nfcUpdateImagesController };
