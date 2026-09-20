import express from 'express';
import multer from 'multer';
import contactController from '../controller/contact.controller.js';
import { contactSubmissionSchema, customizationRequestSchema } from '../validation/contact.validation.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { authGuardService } from '../services/common.auth.service.js';

const router = express.Router();

/* Reference picture for a customization request — optional, in memory, straight
   on to S3. Same limits as the review uploader. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

router.post(
  '/contact/submit',
  validateRequest(contactSubmissionSchema),
  contactController.submitContactForm
);

/* Open to guests on purpose: someone can ask for a custom piece before they
   have an account. multer runs first so the text fields are parsed out of the
   multipart body before Joi sees them. */
router.post(
  '/contact/customization',
  upload.single('image'),
  validateRequest(customizationRequestSchema),
  contactController.submitCustomizationRequest
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
