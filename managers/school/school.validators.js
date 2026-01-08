const Joi = require('joi');

const createSchoolSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'School name must be at least 3 characters',
      'string.max': 'School name cannot exceed 100 characters',
      'any.required': 'School name is required'
    }),
  address: Joi.object({
    street: Joi.string().trim().max(100),
    city: Joi.string().trim().max(50),
    state: Joi.string().trim().max(50),
    zipCode: Joi.string().trim().max(20),
    country: Joi.string().trim().max(50)
  }).optional(),
  contactInfo: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Contact email is required'
      }),
    phone: Joi.string().trim().max(20),
    website: Joi.string().uri().trim()
  }).required(),
  establishedYear: Joi.number()
    .integer()
    .min(1800)
    .max(new Date().getFullYear())
    .messages({
      'number.min': 'Establishment year must be after 1800',
      'number.max': 'Establishment year cannot be in the future'
    }),
  principalName: Joi.string().trim().max(100),
  totalCapacity: Joi.number()
    .integer()
    .min(1)
    .messages({
      'number.min': 'Total capacity must be at least 1'
    })
});

const updateSchoolSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100),
  address: Joi.object({
    street: Joi.string().trim().max(100),
    city: Joi.string().trim().max(50),
    state: Joi.string().trim().max(50),
    zipCode: Joi.string().trim().max(20),
    country: Joi.string().trim().max(50)
  }),
  contactInfo: Joi.object({
    email: Joi.string().email(),
    phone: Joi.string().trim().max(20),
    website: Joi.string().uri().trim()
  }),
  establishedYear: Joi.number().integer().min(1800).max(new Date().getFullYear()),
  principalName: Joi.string().trim().max(100),
  totalCapacity: Joi.number().integer().min(1),
  isActive: Joi.boolean()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

module.exports = {
  createSchoolSchema,
  updateSchoolSchema
};
