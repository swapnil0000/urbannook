import express from 'express';
import contactController from '../controller/contact.controller.js';
import { contactSubmissionSchema } from '../validation/contact.validation.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { authGuardService } from '../services/common.auth.service.js';

const router = express.Router();

// Public route - Submit contact form
router.post(
  '/submit',
  validateRequest(contactSubmissionSchema),
  contactController.submitContactForm
);

// Admin routes - Manage submissions
router.get(
  '/submissions',
  authGuardService('Admin'),
  contactController.getAllSubmissions
);

router.patch(
  '/submissions/:id',
  authGuardService('Admin'),
  contactController.updateSubmissionStatus
);

export default router;
