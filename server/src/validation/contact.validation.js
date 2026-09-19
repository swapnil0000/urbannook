import Joi from 'joi';

const contactSubmissionSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required'
    }),
  
  email: Joi.string()
    .trim()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  subject: Joi.string()
    .valid('Product Inquiry','Support','Order Support', 'Technical Support', 'Returns & Refunds','General Inquiry')
    .required()
    .messages({
      'any.only': 'Subject must be one of: Product Inquiry,  Support',
      'any.required': 'Subject is required'
    }),
  
  message: Joi.string()
    .trim()
    .min(10)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'Message is required',
      'string.min': 'Message must be at least 10 characters',
      'string.max': 'Message cannot exceed 2000 characters',
      'any.required': 'Message is required'
    }),

  mobile: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Please provide a valid 10-digit mobile number'
    }),

  productId: Joi.string().trim().optional().allow('', null),

  productName: Joi.string().trim().max(200).optional().allow('', null)
});

/**
 * Customization request. Same shape as a contact message minus the subject
 * (the route pins that to 'Customization'), plus the variant. Arrives as
 * multipart when a reference picture is attached, so every value is a string
 * by the time Joi sees it.
 */
const customizationRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters',
    'any.required': 'Name is required'
  }),

  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),

  mobile: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required().messages({
    'string.empty': 'Mobile number is required',
    'string.pattern.base': 'Please provide a valid 10-digit mobile number',
    'any.required': 'Mobile number is required'
  }),

  message: Joi.string().trim().min(10).max(2000).required().messages({
    'string.empty': 'Tell us what you would like customised',
    'string.min': 'Please describe the customisation in at least 10 characters',
    'string.max': 'Description cannot exceed 2000 characters',
    'any.required': 'Tell us what you would like customised'
  }),

  productId: Joi.string().trim().optional().allow('', null),
  productName: Joi.string().trim().max(200).optional().allow('', null),
  variantName: Joi.string().trim().max(200).optional().allow('', null)
});

export { contactSubmissionSchema, customizationRequestSchema };
