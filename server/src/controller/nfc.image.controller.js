import { ApiError, ApiRes } from "../utlis/index.js";
import {
  nfcUpsertService,
  nfcGetUploadedDataService,
  nfcChangeUserPasswordService,
} from "../services/nfc.image.service.js";

const nfcUpsertController = async (req, res) => {
  try {
    const { userId } = req.params;
    const files = req.files || [];

    // Extract fields from FormData
    const { text1, text2, indices, password } = req.body;

    let parsedIndices = [];
    if (indices) {
      if (Array.isArray(indices)) {
        parsedIndices = indices.map((i) => parseInt(i));
      } else {
        parsedIndices = [parseInt(indices)];
      }
    }

    const nfcUpsertServiceValidation = await nfcUpsertService({
      userId,
      files,
      text1,
      text2,
      indices: parsedIndices,
      password, // Pass password to service
    });

    if (!nfcUpsertServiceValidation.success) {
      return res
        .status(nfcUpsertServiceValidation.statusCode)
        .json(
          new ApiError(
            nfcUpsertServiceValidation.statusCode,
            nfcUpsertServiceValidation.message,
            nfcUpsertServiceValidation.data,
            nfcUpsertServiceValidation.success,
          ),
        );
    }

    return res
      .status(nfcUpsertServiceValidation.statusCode)
      .json(
        new ApiRes(
          nfcUpsertServiceValidation.statusCode,
          nfcUpsertServiceValidation.message,
          nfcUpsertServiceValidation.data,
          nfcUpsertServiceValidation.success,
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

    const nfcGetUploadedDataServiceValidation = await nfcGetUploadedDataService({ userId });

    if (!nfcGetUploadedDataServiceValidation.success && nfcGetUploadedDataServiceValidation.statusCode !== 200) {
      return res
        .status(nfcGetUploadedDataServiceValidation.statusCode)
        .json(new ApiError(nfcGetUploadedDataServiceValidation.statusCode, nfcGetUploadedDataServiceValidation.message, null, false));
    }

    return res
      .status(nfcGetUploadedDataServiceValidation.statusCode)
      .json(
        new ApiRes(
          nfcGetUploadedDataServiceValidation.statusCode,
          nfcGetUploadedDataServiceValidation.message,
          nfcGetUploadedDataServiceValidation.data,
          nfcGetUploadedDataServiceValidation.success,
        ),
      );
  } catch (error) {
    console.error("NFC Get Error:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Failed to fetch data", null, false));
  }
};

const nfcChangeUserPassword = async (req, res) => {
  const { userId, password, newPass } = req.body || {};
  const nfcChangeUserPasswordServiceValidation =
    await nfcChangeUserPasswordService({ userId, password, newPass });
  if (!nfcChangeUserPasswordServiceValidation.success) {
    return res
      .status(nfcChangeUserPasswordServiceValidation.statusCode)
      .json(
        new ApiError(
          nfcChangeUserPasswordServiceValidation.statusCode,
          nfcChangeUserPasswordServiceValidation.message,
          nfcChangeUserPasswordServiceValidation.data,
          nfcChangeUserPasswordServiceValidation.success,
        ),
      );
  }
  return res
    .status(nfcChangeUserPasswordServiceValidation.statusCode)
    .json(
      new ApiRes(
        nfcChangeUserPasswordServiceValidation.statusCode,
        nfcChangeUserPasswordServiceValidation.message,
        nfcChangeUserPasswordServiceValidation.data,
        nfcChangeUserPasswordServiceValidation.success,
      ),
    );
};

export { nfcUpsertController, nfcGetController, nfcChangeUserPassword };