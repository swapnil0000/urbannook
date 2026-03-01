/**
 * Order Validation Schemas
 * 
 * Joi schemas for validating order-related requests.
 */

import Joi from 'joi';

/**
 * Create Order Schema
 * Validates: items, senderMobile, receiverMobile
 */
export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one item is required',
      'any.required': 'Items are required',
    }),
  
  senderMobile: Joi.string()
    .trim()
    .pattern(/^[0-9]{10}$/)
    .messages({
      'string.pattern.base': 'Sender mobile number must be exactly 10 digits',
    }),
  
  receiverMobile: Joi.string()
    .trim()
    .pattern(/^[0-9]{10}$/)
    .allow('')
    .messages({
      'string.pattern.base': 'Receiver mobile number must be exactly 10 digits',
    }),
});
