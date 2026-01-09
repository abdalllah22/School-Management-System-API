/**
 * School Manager Unit Tests
 * 
 * Testing TRUE Axion pattern - Business logic only
 * No HTTP concerns, pure function testing
 */

const SchoolManager = require('../../managers/school/School.manager');
const { School } = require('../../loaders');
const { createTestUser, createTestSchool, generateMockToken } = require('../helpers/factories');

describe('School Manager', () => {
  let schoolManager;

  beforeEach(() => {
    schoolManager = new SchoolManager();
  });

  // ==========================================
  // GET ALL TESTS
  // ==========================================

  describe('getAll()', () => {
    it('should return all schools for superadmin', async () => {
      // Arrange
      await createTestSchool({ name: 'School 1' });
      await createTestSchool({ name: 'School 2' });
      await createTestSchool({ name: 'School 3' });

      const mockToken = generateMockToken({ role: 'superadmin' });

      const params = {
        __token: mockToken,
        page: 1,
        limit: 20
      };

      // Act
      const result = await schoolManager.getAll(params);

      // Assert
      expect(result).toHaveProperty('schools');
      expect(result).toHaveProperty('pagination');
      expect(result.schools).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.page).toBe(1);
    });

    it('should return error if not superadmin', async () => {
      // Arrange
      const mockToken = generateMockToken({ role: 'school_admin' });

      const params = {
        __token: mockToken,
        page: 1,
        limit: 20
      };

      // Act
      const result = await schoolManager.getAll(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'FORBIDDEN');
      expect(result.error).toContain('superadmin');
    });

    it('should paginate results correctly', async () => {
      // Arrange - Create 5 schools
      for (let i = 1; i <= 5; i++) {
        await createTestSchool({ name: `School ${i}` });
      }

      const mockToken = generateMockToken({ role: 'superadmin' });

      const params = {
        __token: mockToken,
        page: 1,
        limit: 2 // Only 2 per page
      };

      // Act
      const result = await schoolManager.getAll(params);

      // Assert
      expect(result.schools).toHaveLength(2);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.pages).toBe(3); // 5 schools / 2 per page = 3 pages
    });

    it('should search schools by name', async () => {
      // Arrange
      await createTestSchool({ name: 'Springfield Elementary' });
      await createTestSchool({ name: 'Riverside High' });
      await createTestSchool({ name: 'Springfield Academy' });

      const mockToken = generateMockToken({ role: 'superadmin' });

      const params = {
        __token: mockToken,
        search: 'Springfield'
      };

      // Act
      const result = await schoolManager.getAll(params);

      // Assert
      expect(result.schools).toHaveLength(2);
      expect(result.schools[0].name).toContain('Springfield');
      expect(result.schools[1].name).toContain('Springfield');
    });

    it('should only return active schools', async () => {
      // Arrange
      await createTestSchool({ name: 'Active School', isActive: true });
      await createTestSchool({ name: 'Inactive School', isActive: false });

      const mockToken = generateMockToken({ role: 'superadmin' });

      const params = {
        __token: mockToken
      };

      // Act
      const result = await schoolManager.getAll(params);

      // Assert
      expect(result.schools).toHaveLength(1);
      expect(result.schools[0].name).toBe('Active School');
    });
  });

  // ==========================================
  // GET BY ID TESTS
  // ==========================================

  describe('getById()', () => {
    it('should return school for superadmin', async () => {
      // Arrange
      const school = await createTestSchool({ name: 'Test School' });
      const mockToken = generateMockToken({ role: 'superadmin' });

      const params = {
        __token: mockToken,
        schoolId: school._id.toString()
      };

      // Act
      const result = await schoolManager.getById(params);

      // Assert
      expect(result).toHaveProperty('school');
      expect(result.school.name).toBe('Test School');
      expect(result.school._id.toString()).toBe(school._id.toString());
    });

    it('should allow school admin to access their own school', async () => {
      // Arrange
      const school = await createTestSchool();
      const mockToken = generateMockToken({ 
        role: 'school_admin',
        schoolId: school._id.toString()
      });

      const params = {
        __token: mockToken,
        schoolId: school._id.toString()
      };

      // Act
      const result = await schoolManager.getById(params);

      // Assert
      expect(result).toHaveProperty('school');
      expect(result.school._id.toString()).toBe(school._id.toString());
    });

    it('should deny school admin access to other schools', async () => {
      // Arrange
      const school1 = await createTestSchool();
      const school2 = await createTestSchool();
      
      const mockToken = generateMockToken({ 
        role: 'school_admin',
        schoolId: school1._id.toString() // Admin of school1
      });

      const params = {
        __token: mockToken,
        schoolId: school2._id.toString() // Trying to access school2
      };

      // Act
      const result = await schoolManager.getById(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'FORBIDDEN');
    });

    it('should return error if school not found', async () => {
      // Arrange
      const mockToken = generateMockToken({ role: 'superadmin' });

      const params = {
        __token: mockToken,
        schoolId: '507f1f77bcf86cd799439011' // Valid ObjectId but doesn't exist
      };

      // Act
      const result = await schoolManager.getById(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  // ==========================================
  // CREATE TESTS
  // ==========================================

  describe('create()', () => {
    it('should create school for superadmin', async () => {
      // Arrange
      const admin = await createTestUser({ role: 'superadmin' });
      
      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'superadmin'
        },
        name: 'New Test School',
        contactInfo: {
          email: 'newschool@test.com',
          phone: '+1-555-0123'
        },
        totalCapacity: 600
      };

      // Act
      const result = await schoolManager.create(params);

      // Assert
      expect(result).toHaveProperty('school');
      expect(result).toHaveProperty('message');
      expect(result.school.name).toBe('New Test School');
      expect(result.school.totalCapacity).toBe(600);
      expect(result.school.createdBy.toString()).toBe(admin._id.toString());
    });

    it('should deny school creation for school_admin', async () => {
      // Arrange
      const schoolAdmin = await createTestUser({ role: 'school_admin' });

      const params = {
        __token: {
          userId: schoolAdmin._id.toString(),
          role: 'school_admin'
        },
        name: 'Unauthorized School',
        contactInfo: {
          email: 'test@test.com'
        }
      };

      // Act
      const result = await schoolManager.create(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'FORBIDDEN');
    });

    it('should populate createdBy field', async () => {
      // Arrange
      const admin = await createTestUser({ 
        role: 'superadmin',
        firstName: 'Admin',
        lastName: 'User'
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'superadmin'
        },
        name: 'Test School',
        contactInfo: {
          email: 'school@test.com'
        }
      };

      // Act
      const result = await schoolManager.create(params);

      // Assert
      expect(result.school.createdBy).toBeDefined();
      expect(result.school.createdBy.firstName).toBe('Admin');
      expect(result.school.createdBy.lastName).toBe('User');
    });
  });

  // ==========================================
  // UPDATE TESTS
  // ==========================================

  describe('update()', () => {
    it('should update school for superadmin', async () => {
      // Arrange
      const school = await createTestSchool({ 
        name: 'Old Name',
        totalCapacity: 500
      });

      const params = {
        __token: generateMockToken({ role: 'superadmin' }),
        schoolId: school._id.toString(),
        name: 'New Name',
        totalCapacity: 700
      };

      // Act
      const result = await schoolManager.update(params);

      // Assert
      expect(result).toHaveProperty('school');
      expect(result).toHaveProperty('message');
      expect(result.school.name).toBe('New Name');
      expect(result.school.totalCapacity).toBe(700);
    });

    it('should deny update for school_admin', async () => {
      // Arrange
      const school = await createTestSchool();

      const params = {
        __token: generateMockToken({ role: 'school_admin' }),
        schoolId: school._id.toString(),
        name: 'Unauthorized Update'
      };

      // Act
      const result = await schoolManager.update(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'FORBIDDEN');
    });

    it('should return error if school not found', async () => {
      // Arrange
      const params = {
        __token: generateMockToken({ role: 'superadmin' }),
        schoolId: '507f1f77bcf86cd799439011',
        name: 'Update'
      };

      // Act
      const result = await schoolManager.update(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  // ==========================================
  // DELETE TESTS (Soft Delete)
  // ==========================================

  describe('delete()', () => {
    it('should soft delete school for superadmin', async () => {
      // Arrange
      const school = await createTestSchool({ isActive: true });

      const params = {
        __token: generateMockToken({ role: 'superadmin' }),
        schoolId: school._id.toString()
      };

      // Act
      const result = await schoolManager.delete(params);

      // Assert
      expect(result).toHaveProperty('message');
      
      // Verify school is soft deleted
      const deletedSchool = await School.findById(school._id);
      expect(deletedSchool.isActive).toBe(false);
    });

    it('should deny delete for school_admin', async () => {
      // Arrange
      const school = await createTestSchool();

      const params = {
        __token: generateMockToken({ role: 'school_admin' }),
        schoolId: school._id.toString()
      };

      // Act
      const result = await schoolManager.delete(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'FORBIDDEN');
    });
  });

  // ==========================================
  // GET STATS TESTS
  // ==========================================

  describe('getStats()', () => {
    it('should return school statistics', async () => {
      // Arrange
      const school = await createTestSchool({ totalCapacity: 500 });

      const params = {
        __token: generateMockToken({ role: 'superadmin' }),
        schoolId: school._id.toString()
      };

      // Act
      const result = await schoolManager.getStats(params);

      // Assert
      expect(result).toHaveProperty('school');
      expect(result).toHaveProperty('stats');
      expect(result.stats).toHaveProperty('classrooms');
      expect(result.stats).toHaveProperty('students');
      expect(result.stats).toHaveProperty('capacity');
      expect(result.stats).toHaveProperty('utilizationRate');
      expect(result.stats.capacity).toBe(500);
    });

    it('should allow school admin to view their school stats', async () => {
      // Arrange
      const school = await createTestSchool();

      const params = {
        __token: generateMockToken({ 
          role: 'school_admin',
          schoolId: school._id.toString()
        }),
        schoolId: school._id.toString()
      };

      // Act
      const result = await schoolManager.getStats(params);

      // Assert
      expect(result).toHaveProperty('stats');
      expect(result.stats).toHaveProperty('classrooms', 0);
      expect(result.stats).toHaveProperty('students', 0);
    });

    it('should deny stats access to other schools for school_admin', async () => {
      // Arrange
      const school1 = await createTestSchool();
      const school2 = await createTestSchool();

      const params = {
        __token: generateMockToken({ 
          role: 'school_admin',
          schoolId: school1._id.toString()
        }),
        schoolId: school2._id.toString()
      };

      // Act
      const result = await schoolManager.getStats(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'FORBIDDEN');
    });
  });
});
