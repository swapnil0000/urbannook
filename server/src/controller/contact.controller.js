import crypto from "node:crypto";
import contactService from "../services/contact.service.js";
import { uploadCustomizationImageToS3 } from "../utils/s3.utils.js";
import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

class ContactController {
  submitContactForm = asyncHandler(async (req, res) => {
    const { name, email, subject, message, mobile, productId, productName } = req.body;

    const result = await contactService.createSubmission({
      name,
      email,
      subject,
      message,
      mobile,
      productId,
      productName,
    });

    return res
      .status(result.statusCode)
      .json(new ApiRes(result.statusCode, result.message, result.data));
  });

  /**
   * Customization request. Stored as a Contact with the subject pinned to
   * 'Customization', so these land in the same admin inbox as every other
   * message and reuse its status workflow — filter by that subject to see
   * only customization work.
   *
   * The reference picture is optional and the visitor need not be logged in,
   * so a failed upload must not lose the request: if S3 rejects the file the
   * text still gets saved and the customer is told the picture did not stick.
   */
  submitCustomizationRequest = asyncHandler(async (req, res) => {
    const { name, email, message, mobile, productId, productName, variantName } = req.body;

    const referenceImages = [];
    let imageFailed = false;
    const file = req.file || (req.files?.length ? req.files[0] : null);

    if (file?.buffer) {
      try {
        const ref = crypto.randomUUID();
        referenceImages.push(
          await uploadCustomizationImageToS3(file.buffer, file.mimetype, ref),
        );
      } catch {
        imageFailed = true;
      }
    }

    const result = await contactService.createSubmission({
      name,
      email,
      subject: "Customization",
      message,
      mobile,
      productId,
      productName,
      variantName,
      referenceImages,
    });

    const note = imageFailed
      ? " (we could not attach your picture — reply to our email with it)"
      : "";

    return res
      .status(result.statusCode)
      .json(new ApiRes(result.statusCode, `${result.message}${note}`, result.data));
  });

  getAllSubmissions = asyncHandler(async (req, res) => {
    const { status, subject, page, limit } = req.query;

    const result = await contactService.getAllSubmissions({
      status,
      subject,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    return res
      .status(result.statusCode)
      .json(new ApiRes(result.statusCode, result.message, result.data));
  });

  updateSubmissionStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const adminId = req.admin?._id;

    const result = await contactService.updateSubmissionStatus(id, {
      status,
      adminNotes,
      adminId,
    });

    return res
      .status(result.statusCode)
      .json(new ApiRes(result.statusCode, result.message, result.data));
  });
}

export default new ContactController();
