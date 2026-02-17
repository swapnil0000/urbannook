import contactService from '../services/contact.service.js';
import { ApiRes, ApiError } from '../utlis/index.js';

class ContactController {
  async submitContactForm(req, res, next) {
    try {
      const { name, email, subject, message } = req.body;

      const result = await contactService.createSubmission({
        name,
        email,
        subject,
        message
      });

      if (!result.success) {
        return next(new ApiError(result.statusCode, result.message));
      }

      return res.status(result.statusCode).json(
        new ApiRes(result.statusCode, result.message, result.data)
      );
    } catch (error) {
      console.error('Error in submitContactForm controller:', error);
      return next(new ApiError(500, 'An unexpected error occurred'));
    }
  }

  async getAllSubmissions(req, res, next) {
    try {
      const { status, subject, page, limit } = req.query;

      const result = await contactService.getAllSubmissions({
        status,
        subject,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      });

      if (!result.success) {
        return next(new ApiError(result.statusCode, result.message));
      }

      return res.status(result.statusCode).json(
        new ApiRes(result.statusCode, result.message, result.data)
      );
    } catch (error) {
      console.error('Error in getAllSubmissions controller:', error);
      return next(new ApiError(500, 'An unexpected error occurred'));
    }
  }

  async updateSubmissionStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;
      const adminId = req.admin?._id;

      const result = await contactService.updateSubmissionStatus(id, {
        status,
        adminNotes,
        adminId
      });

      if (!result.success) {
        return next(new ApiError(result.statusCode, result.message));
      }

      return res.status(result.statusCode).json(
        new ApiRes(result.statusCode, result.message, result.data)
      );
    } catch (error) {
      console.error('Error in updateSubmissionStatus controller:', error);
      return next(new ApiError(500, 'An unexpected error occurred'));
    }
  }
}

export default new ContactController();
