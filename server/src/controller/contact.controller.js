import contactService from "../services/contact.service.js";
import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

class ContactController {
  submitContactForm = asyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body;

    const result = await contactService.createSubmission({
      name,
      email,
      subject,
      message,
    });

    return res
      .status(result.statusCode)
      .json(new ApiRes(result.statusCode, result.message, result.data));
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
