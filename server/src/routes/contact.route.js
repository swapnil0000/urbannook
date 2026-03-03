import express from 'express';
import contactController from '../controller/contact.controller.js';
import { contactSubmissionSchema } from '../validation/contact.validation.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { authGuardService } from '../services/common.auth.service.js';

const router = express.Router();

router.post(
  '/contact/submit',
  validateRequest(contactSubmissionSchema),
  contactController.submitContactForm
);

router.get(
  '/contact/submissions',
  authGuardService('Admin'),
  contactController.getAllSubmissions
);

router.patch(
  '/contact/submissions/:id',
  authGuardService('Admin'),
  contactController.updateSubmissionStatus
);

export default router;
