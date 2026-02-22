import { ApiRes } from "../utils/index.js";
import {
  nfcUpsertService,
  nfcGetUploadedDataService,
  nfcChangeUserPasswordService,
} from "../services/nfc.image.service.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

const nfcUpsertController = asyncHandler(async (req, res) => {
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
});

const nfcGetController = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const nfcGetUploadedDataServiceValidation = await nfcGetUploadedDataService(
    { userId },
  );

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
});

const nfcChangeUserPassword = asyncHandler(async (req, res) => {
  const { userId, password, newPass } = req.body || {};
  const nfcChangeUserPasswordServiceValidation =
    await nfcChangeUserPasswordService({ userId, password, newPass });
  
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
});

export { nfcUpsertController, nfcGetController, nfcChangeUserPassword };
