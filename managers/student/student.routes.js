/**
 * Student Routes - TRUE AXION PATTERN
 * Uses cortex.executeManager() to execute StudentManager methods
 */

const express = require('express');
const router = express.Router();
const cortex = require('../../libs/cortex');
const StudentManager = require('./Student.manager');
const { createStudentSchema, updateStudentSchema, transferStudentSchema } = require('./student.validators');

// All routes require authentication
router.use(cortex.authenticate());

// GET /api/v1/students - List all students
router.get('/',
  cortex.executeManager(StudentManager, 'getAll')
);

// GET /api/v1/students/:id - Get student by ID
router.get('/:id',
  cortex.executeManager(StudentManager, 'getById')
);

// POST /api/v1/students - Enroll new student
router.post('/',
  cortex.validate(createStudentSchema),
  cortex.executeManager(StudentManager, 'create')
);

// PUT /api/v1/students/:id - Update student
router.put('/:id',
  cortex.validate(updateStudentSchema),
  cortex.executeManager(StudentManager, 'update')
);

// DELETE /api/v1/students/:id - Withdraw student
router.delete('/:id',
  cortex.executeManager(StudentManager, 'delete')
);

// POST /api/v1/students/:id/transfer - Transfer student to another classroom
router.post('/:id/transfer',
  cortex.validate(transferStudentSchema),
  cortex.executeManager(StudentManager, 'transfer')
);

// GET /api/v1/students/classroom/:classroomId - Get students by classroom
router.get('/classroom/:classroomId',
  cortex.executeManager(StudentManager, 'getByClassroom')
);

// GET /api/v1/students/school/:schoolId - Get students by school
router.get('/school/:schoolId',
  cortex.executeManager(StudentManager, 'getBySchool')
);

module.exports = router;
