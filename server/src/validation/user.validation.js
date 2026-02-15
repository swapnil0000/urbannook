/**
 * User Validation Schemas
 * 
 * Joi schemas for validating user-related requests.
 */

import Joi from 'joi';

/**
 * User Registration Schema
 * Validates: name, email, password, mobileNumber
 */
export const registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required',
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  
  password: Joi.string()
    .min(8)
    .max(100)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 100 characters',
      'any.required': 'Password is required',
    }),
  
  mobileNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Mobile number must be exactly 10 digits',
      'any.required': 'Mobile number is required',
    }),
});

/**
 * User Login Schema
 * Validates: email, password
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});

/**
 * Update Profile Schema
 * Validates: name, email, mobileNumber (at least one required)
 */
export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
    }),
  
  email: Joi.string()
    .email()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
  
  mobileNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .messages({
      'string.pattern.base': 'Mobile number must be exactly 10 digits',
    }),
}).min(1).messages({
  'object.min': 'At least one field (name, email, or mobileNumber) is required',
});

/**
 * Forgot Password Request Schema
 * Validates: email
 */
export const forgotPasswordRequestSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
});

/**
 * Forgot Password Reset Schema
 * Validates: email, otp, newPassword
 */
export const forgotPasswordResetSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'OTP must be exactly 6 digits',
      'string.pattern.base': 'OTP must contain only numbers',
      'any.required': 'OTP is required',
    }),
  
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 100 characters',
      'any.required': 'New password is required',
    }),
});

/**
 * Reset Password Schema (for authenticated users)
 * Validates: currentPassword, newPassword
 */
export const resetPasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required',
    }),
  
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password cannot exceed 100 characters',
      'any.required': 'New password is required',
    }),
});
