const Joi = require('joi');

const createStudentSchema = Joi.object({
  schoolId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid school ID format',
      'any.required': 'School ID is required'
    }),
  classroomId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid classroom ID format',
      'any.required': 'Classroom ID is required'
    }),
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
  dateOfBirth: Joi.date()
    .max('now')
    .required()
    .messages({
      'date.max': 'Date of birth must be in the past',
      'any.required': 'Date of birth is required'
    }),
  gender: Joi.string()
    .valid('male', 'female', 'other')
    .messages({
      'any.only': 'Gender must be male, female, or other'
    }),
  contactInfo: Joi.object({
    email: Joi.string().email(),
    phone: Joi.string().trim().max(20),
    address: Joi.object({
      street: Joi.string().trim().max(100),
      city: Joi.string().trim().max(50),
      state: Joi.string().trim().max(50),
      zipCode: Joi.string().trim().max(20),
      country: Joi.string().trim().max(50)
    })
  }),
  guardian: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Guardian name must be at least 2 characters',
        'any.required': 'Guardian name is required'
      }),
    relationship: Joi.string().trim().max(50),
    email: Joi.string().email(),
    phone: Joi.string()
      .trim()
      .max(20)
      .required()
      .messages({
        'any.required': 'Guardian phone is required'
      })
  }).required().messages({
    'any.required': 'Guardian information is required'
  }),
  academicInfo: Joi.object({
    previousSchool: Joi.string().trim().max(100),
    gradeLevel: Joi.number().integer().min(1).max(12)
  })
});

const updateStudentSchema = Joi.object({
  classroomId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  firstName: Joi.string().trim().min(2).max(50),
  lastName: Joi.string().trim().min(2).max(50),
  dateOfBirth: Joi.date().max('now'),
  gender: Joi.string().valid('male', 'female', 'other'),
  contactInfo: Joi.object({
    email: Joi.string().email(),
    phone: Joi.string().trim().max(20),
    address: Joi.object({
      street: Joi.string().trim().max(100),
      city: Joi.string().trim().max(50),
      state: Joi.string().trim().max(50),
      zipCode: Joi.string().trim().max(20),
      country: Joi.string().trim().max(50)
    })
  }),
  guardian: Joi.object({
    name: Joi.string().trim().min(2).max(100),
    relationship: Joi.string().trim().max(50),
    email: Joi.string().email(),
    phone: Joi.string().trim().max(20)
  }),
  status: Joi.string().valid('active', 'transferred', 'graduated', 'withdrawn'),
  academicInfo: Joi.object({
    previousSchool: Joi.string().trim().max(100),
    gradeLevel: Joi.number().integer().min(1).max(12)
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

const transferStudentSchema = Joi.object({
  newClassroomId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid classroom ID format',
      'any.required': 'New classroom ID is required'
    }),
  reason: Joi.string()
    .trim()
    .max(200)
    .messages({
      'string.max': 'Reason cannot exceed 200 characters'
    })
});

module.exports = {
  createStudentSchema,
  updateStudentSchema,
  transferStudentSchema
};
