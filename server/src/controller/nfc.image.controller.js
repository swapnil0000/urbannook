import { ApiError, ApiRes } from "../utlis/index.js";
import {
  nfcUpsertService,
  nfcGetUploadedDataService,
} from "../services/nfc.image.service.js";

const nfcUpsertController = async (req, res) => {
  try {
    const { userId } = req.params;
    const files = req.files || []; // From multer

    // FormData usually sends numbers as strings, so we parse indices if needed.
    const { text1, text2, indices } = req.body;

    // --- Critical: Parse Indices ---
    let parsedIndices = [];
    if (indices) {
      if (Array.isArray(indices)) {
        parsedIndices = indices.map((i) => parseInt(i));
      } else {
        parsedIndices = [parseInt(indices)];
      }
    }

    const result = await nfcUpsertService({
      userId,
      files,
      text1,
      text2,
      indices: parsedIndices,
    });

    if (!result.success) {
      return res
        .status(result.statusCode)
        .json(
          new ApiError(
            result.statusCode,
            result.message,
            result.data,
            result.success,
          ),
        );
    }

    return res.status(result.statusCode).json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data, 
        result.success,
      ),
    );
  } catch (error) {
    console.error("NFC Upsert Error:", error);
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          error.message || "Internal Server Error",
          null,
          false,
        ),
      );
  }
};

const nfcGetController = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await nfcGetUploadedDataService({ userId });

    if (!result.success && result.statusCode !== 200) {
      return res
        .status(result.statusCode)
        .json(new ApiError(result.statusCode, result.message, null, false));
    }

    return res
      .status(result.statusCode)
      .json(
        new ApiRes(
          result.statusCode,
          result.message,
          result.data,
          result.success,
        ),
      );
  } catch (error) {
    console.error("NFC Get Error:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Failed to fetch data", null, false));
  }
};

export { nfcUpsertController, nfcGetController };
