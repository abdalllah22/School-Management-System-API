/**
 * Test Helpers - Simple Data Factories
 * 
 * Generate test data without external dependencies
 * Pure Jest-based approach
 */

const { User, School, Classroom, Student } = require('../../loaders');

// Simple ID counter for unique emails
let userCounter = 0;
let schoolCounter = 0;
let classroomCounter = 0;
let studentCounter = 0;

/**
 * Reset counters (useful for tests)
 */
function resetCounters() {
  userCounter = 0;
  schoolCounter = 0;
  classroomCounter = 0;
  studentCounter = 0;
}

/**
 * Create test user
 * 
 * @param {Object} overrides - Override default values
 * @returns {Promise<Object>} Created user
 */
async function createTestUser(overrides = {}) {
  userCounter++;
  
  const userData = {
    email: overrides.email || `testuser${userCounter}@test.com`,
    password: overrides.password || 'TestPassword123!',
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || `User${userCounter}`,
    role: overrides.role || 'superadmin',
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    ...overrides
  };

  const user = await User.create(userData);
  
  // Return user with plain password for testing login
  return {
    ...user.toObject(),
    plainPassword: userData.password
  };
}

/**
 * Create test school
 * 
 * @param {Object} overrides
 * @returns {Promise<Object>} Created school
 */
async function createTestSchool(overrides = {}) {
  schoolCounter++;
  
  // Create a superadmin if createdBy not provided
  let createdBy = overrides.createdBy;
  if (!createdBy) {
    const admin = await createTestUser({ role: 'superadmin' });
    createdBy = admin._id;
  }

  const schoolData = {
    name: overrides.name || `Test School ${schoolCounter}`,
    contactInfo: {
      email: overrides.contactEmail || `school${schoolCounter}@test.com`,
      phone: overrides.contactPhone || `+1-555-${String(schoolCounter).padStart(4, '0')}`,
      website: overrides.website || `https://school${schoolCounter}.test.com`
    },
    address: {
      street: `${schoolCounter} Main Street`,
      city: 'Test City',
      state: 'Test State',
      zipCode: `${String(schoolCounter).padStart(5, '0')}`,
      country: 'Test Country'
    },
    establishedYear: overrides.establishedYear || 2000,
    principalName: overrides.principalName || `Principal ${schoolCounter}`,
    totalCapacity: overrides.totalCapacity || 500,
    createdBy,
    ...overrides
  };

  return await School.create(schoolData);
}

/**
 * Create test classroom
 * 
 * @param {Object} overrides
 * @returns {Promise<Object>} Created classroom
 */
async function createTestClassroom(overrides = {}) {
  classroomCounter++;
  
  // Create school if not provided
  let schoolId = overrides.schoolId;
  if (!schoolId) {
    const school = await createTestSchool();
    schoolId = school._id;
  }

  // Create user if createdBy not provided
  let createdBy = overrides.createdBy;
  if (!createdBy) {
    const user = await createTestUser({ role: 'school_admin', schoolId });
    createdBy = user._id;
  }

  const grade = overrides.grade || Math.min(12, Math.max(1, classroomCounter % 12 + 1));
  const section = overrides.section || String.fromCharCode(65 + (classroomCounter % 26)); // A, B, C, etc.

  const classroomData = {
    schoolId,
    name: overrides.name || `Grade ${grade}-${section}`,
    grade,
    section,
    capacity: overrides.capacity || 30,
    currentEnrollment: overrides.currentEnrollment || 0,
    roomNumber: overrides.roomNumber || `${100 + classroomCounter}`,
    teacher: {
      name: `Teacher ${classroomCounter}`,
      email: `teacher${classroomCounter}@test.com`,
      phone: `+1-555-${String(1000 + classroomCounter).padStart(4, '0')}`
    },
    subjects: overrides.subjects || ['Math', 'Science', 'English'],
    createdBy,
    ...overrides
  };

  return await Classroom.create(classroomData);
}

/**
 * Create test student
 * 
 * @param {Object} overrides
 * @returns {Promise<Object>} Created student
 */
async function createTestStudent(overrides = {}) {
  studentCounter++;
  
  // Create classroom if not provided
  let classroomId = overrides.classroomId;
  let schoolId = overrides.schoolId;
  
  if (!classroomId) {
    const classroom = await createTestClassroom();
    classroomId = classroom._id;
    schoolId = classroom.schoolId;
  } else if (!schoolId) {
    const classroom = await Classroom.findById(classroomId);
    schoolId = classroom.schoolId;
  }

  // Create user if createdBy not provided
  let createdBy = overrides.createdBy;
  if (!createdBy) {
    const user = await createTestUser({ role: 'school_admin', schoolId });
    createdBy = user._id;
  }

  const studentData = {
    schoolId,
    classroomId,
    firstName: overrides.firstName || 'Student',
    lastName: overrides.lastName || `Last${studentCounter}`,
    dateOfBirth: overrides.dateOfBirth || new Date(2010, 0, studentCounter % 28 + 1),
    gender: overrides.gender || (studentCounter % 2 === 0 ? 'male' : 'female'),
    contactInfo: {
      email: `student${studentCounter}@test.com`,
      phone: `+1-555-${String(2000 + studentCounter).padStart(4, '0')}`,
      address: {
        street: `${studentCounter} Student Street`,
        city: 'Test City',
        state: 'Test State',
        zipCode: `${String(10000 + studentCounter).padStart(5, '0')}`,
        country: 'Test Country'
      }
    },
    guardian: {
      name: `Guardian ${studentCounter}`,
      relationship: 'Parent',
      email: `guardian${studentCounter}@test.com`,
      phone: `+1-555-${String(3000 + studentCounter).padStart(4, '0')}`
    },
    status: overrides.status || 'active',
    createdBy,
    ...overrides
  };

  return await Student.create(studentData);
}

/**
 * Generate mock token payload
 * 
 * @param {Object} overrides
 * @returns {Object} Token payload
 */
function generateMockToken(overrides = {}) {
  return {
    userId: overrides.userId || '507f1f77bcf86cd799439011',
    email: overrides.email || 'test@test.com',
    role: overrides.role || 'superadmin',
    schoolId: overrides.schoolId || null,
    ...overrides
  };
}

/**
 * Generate mock headers
 * 
 * @returns {Object} Mock headers
 */
function generateMockHeaders() {
  return {
    'user-agent': 'Mozilla/5.0 (Test Browser)',
    'accept': 'application/json',
    'content-type': 'application/json'
  };
}

module.exports = {
  createTestUser,
  createTestSchool,
  createTestClassroom,
  createTestStudent,
  generateMockToken,
  generateMockHeaders,
  resetCounters
};
