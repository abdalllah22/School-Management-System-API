/**
 * School Routes 
 * Uses cortex.executeManager() to execute SchoolManager methods
 */

const express = require('express');
const router = express.Router();
const cortex = require('../../libs/cortex');
const SchoolManager = require('./School.manager');
const { createSchoolSchema, updateSchoolSchema } = require('./school.validators');

// All routes require authentication
router.use(cortex.authenticate());

// GET /api/v1/schools - List all schools (Superadmin only)
router.get('/', 
  cortex.executeManager(SchoolManager, 'getAll')
);

// GET /api/v1/schools/:id - Get school by ID
router.get('/:id',
  cortex.executeManager(SchoolManager, 'getById')
);

// POST /api/v1/schools - Create new school (Superadmin only)
router.post('/',
  cortex.validate(createSchoolSchema),
  cortex.executeManager(SchoolManager, 'create')
);

// PUT /api/v1/schools/:id - Update school (Superadmin only)
router.put('/:id',
  cortex.validate(updateSchoolSchema),
  cortex.executeManager(SchoolManager, 'update')
);

// DELETE /api/v1/schools/:id - Delete school (Superadmin only)
router.delete('/:id',
  cortex.executeManager(SchoolManager, 'delete')
);

// GET /api/v1/schools/:id/stats - Get school statistics
router.get('/:id/stats',
  cortex.executeManager(SchoolManager, 'getStats')
);

module.exports = router;
