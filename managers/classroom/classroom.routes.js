/**
 * Classroom Routes 
 * Uses cortex.executeManager() to execute ClassroomManager methods
 */

const express = require('express');
const router = express.Router();
const cortex = require('../../libs/cortex');
const ClassroomManager = require('./Classroom.manager');
const { createClassroomSchema, updateClassroomSchema } = require('./classroom.validators');

// All routes require authentication
router.use(cortex.authenticate());

// GET /api/v1/classrooms - List all classrooms
router.get('/',
  cortex.executeManager(ClassroomManager, 'getAll')
);

// GET /api/v1/classrooms/:id - Get classroom by ID
router.get('/:id',
  cortex.executeManager(ClassroomManager, 'getById')
);

// POST /api/v1/classrooms - Create new classroom
router.post('/',
  cortex.validate(createClassroomSchema),
  cortex.executeManager(ClassroomManager, 'create')
);

// PUT /api/v1/classrooms/:id - Update classroom
router.put('/:id',
  cortex.validate(updateClassroomSchema),
  cortex.executeManager(ClassroomManager, 'update')
);

// DELETE /api/v1/classrooms/:id - Delete classroom
router.delete('/:id',
  cortex.executeManager(ClassroomManager, 'delete')
);

// GET /api/v1/classrooms/:id/students - Get students in classroom
router.get('/:id/students',
  cortex.executeManager(ClassroomManager, 'getStudents')
);

module.exports = router;
