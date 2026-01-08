const Joi = require('joi');

const createClassroomSchema = Joi.object({
  schoolId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid school ID format',
      'any.required': 'School ID is required'
    }),
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Classroom name must be at least 2 characters',
      'string.max': 'Classroom name cannot exceed 50 characters',
      'any.required': 'Classroom name is required'
    }),
  grade: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required()
    .messages({
      'number.min': 'Grade must be between 1 and 12',
      'number.max': 'Grade must be between 1 and 12',
      'any.required': 'Grade is required'
    }),
  section: Joi.string()
    .trim()
    .uppercase()
    .max(5)
    .pattern(/^[A-Z]+$/)
    .messages({
      'string.pattern.base': 'Section must contain only letters',
      'string.max': 'Section cannot exceed 5 characters'
    }),
  capacity: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .required()
    .messages({
      'number.min': 'Capacity must be at least 1',
      'number.max': 'Capacity cannot exceed 100',
      'any.required': 'Capacity is required'
    }),
  roomNumber: Joi.string()
    .trim()
    .max(20),
  teacher: Joi.object({
    name: Joi.string().trim().max(100),
    email: Joi.string().email(),
    phone: Joi.string().trim().max(20)
  }),
  subjects: Joi.array()
    .items(Joi.string().trim().max(50))
});

const updateClassroomSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  grade: Joi.number().integer().min(1).max(12),
  section: Joi.string().trim().uppercase().max(5).pattern(/^[A-Z]+$/),
  capacity: Joi.number().integer().min(1).max(100),
  roomNumber: Joi.string().trim().max(20),
  teacher: Joi.object({
    name: Joi.string().trim().max(100),
    email: Joi.string().email(),
    phone: Joi.string().trim().max(20)
  }),
  subjects: Joi.array().items(Joi.string().trim().max(50)),
  isActive: Joi.boolean()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

module.exports = {
  createClassroomSchema,
  updateClassroomSchema
};
