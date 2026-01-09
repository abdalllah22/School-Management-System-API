/**
 * Classroom Manager Unit Tests
 * 
 * Testing business logic for classroom management
 * Capacity validation, school isolation, etc.
 */

const ClassroomManager = require('../../managers/classroom/Classroom.manager');
const { Classroom } = require('../../loaders');
const { 
  createTestSchool, 
  createTestClassroom, 
  createTestStudent,
  generateMockToken 
} = require('../helpers/factories');

describe('Classroom Manager', () => {
  let classroomManager;

  beforeEach(() => {
    classroomManager = new ClassroomManager();
  });

  // ==========================================
  // GET ALL TESTS
  // ==========================================

  describe('getAll()', () => {
    it('should return all classrooms for superadmin', async () => {
      // Arrange
      await createTestClassroom({ name: 'Class 1' });
      await createTestClassroom({ name: 'Class 2' });

      const mockToken = generateMockToken({ role: 'superadmin' });

      const params = {
        __token: mockToken
      };

      // Act
      const result = await classroomManager.getAll(params);

      // Assert
      expect(result).toHaveProperty('classrooms');
      expect(result.classrooms).toHaveLength(2);
    });

    it('should filter classrooms by school for school_admin', async () => {
      // Arrange
      const school1 = await createTestSchool();
      const school2 = await createTestSchool();

      await createTestClassroom({ schoolId: school1._id, name: 'School 1 Class' });
      await createTestClassroom({ schoolId: school2._id, name: 'School 2 Class' });

      const mockToken = generateMockToken({ 
        role: 'school_admin',
        schoolId: school1._id.toString()
      });

      const params = {
        __token: mockToken
      };

      // Act
      const result = await classroomManager.getAll(params);

      // Assert
      expect(result.classrooms).toHaveLength(1);
      expect(result.classrooms[0].name).toBe('School 1 Class');
    });

    it('should support pagination', async () => {
      // Arrange
      for (let i = 1; i <= 5; i++) {
        await createTestClassroom({ name: `Class ${i}` });
      }

      const params = {
        __token: generateMockToken({ role: 'superadmin' }),
        page: 1,
        limit: 2
      };

      // Act
      const result = await classroomManager.getAll(params);

      // Assert
      expect(result.classrooms).toHaveLength(2);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.pages).toBe(3);
    });
  });

  // ==========================================
  // CREATE TESTS
  // ==========================================

  describe('create()', () => {
    it('should create classroom successfully', async () => {
      // Arrange
      const school = await createTestSchool();

      const params = {
        __token: generateMockToken({ 
          userId: '507f1f77bcf86cd799439011',
          role: 'school_admin',
          schoolId: school._id.toString()
        }),
        schoolId: school._id.toString(),
        name: 'Grade 5-A',
        grade: 5,
        section: 'A',
        capacity: 30,
        subjects: ['Math', 'Science']
      };

      // Act
      const result = await classroomManager.create(params);

      // Assert
      expect(result).toHaveProperty('classroom');
      expect(result).toHaveProperty('message');
      expect(result.classroom.name).toBe('Grade 5-A');
      expect(result.classroom.grade).toBe(5);
      expect(result.classroom.capacity).toBe(30);
      expect(result.classroom.currentEnrollment).toBe(0);
    });

    it('should deny creation if school does not exist', async () => {
      // Arrange
      const params = {
        __token: generateMockToken({ 
          role: 'superadmin'
        }),
        schoolId: '507f1f77bcf86cd799439011', // Non-existent
        name: 'Grade 5-A',
        grade: 5,
        section: 'A',
        capacity: 30
      };

      // Act
      const result = await classroomManager.create(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should deny creation for school_admin of different school', async () => {
      // Arrange
      const school1 = await createTestSchool();
      const school2 = await createTestSchool();

      const params = {
        __token: generateMockToken({ 
          role: 'school_admin',
          schoolId: school1._id.toString()
        }),
        schoolId: school2._id.toString(), // Different school
        name: 'Grade 5-A',
        grade: 5,
        capacity: 30
      };

      // Act
      const result = await classroomManager.create(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'FORBIDDEN');
    });
  });

  // ==========================================
  // UPDATE TESTS
  // ==========================================

  describe('update()', () => {
    it('should update classroom successfully', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom = await createTestClassroom({
        schoolId: school._id,
        capacity: 30,
        currentEnrollment: 10
      });

      const params = {
        __token: generateMockToken({ 
          role: 'school_admin',
          schoolId: school._id.toString()
        }),
        classroomId: classroom._id.toString(),
        capacity: 40
      };

      // Act
      const result = await classroomManager.update(params);

      // Assert
      expect(result).toHaveProperty('classroom');
      expect(result.classroom.capacity).toBe(40);
    });

    it('should prevent reducing capacity below current enrollment', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom = await createTestClassroom({
        schoolId: school._id,
        capacity: 30,
        currentEnrollment: 25
      });

      const params = {
        __token: generateMockToken({ 
          role: 'school_admin',
          schoolId: school._id.toString()
        }),
        classroomId: classroom._id.toString(),
        capacity: 20 // Less than current enrollment (25)
      };

      // Act
      const result = await classroomManager.update(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'BUSINESS_ERROR');
      expect(result.error).toContain('below current enrollment');
    });

    it('should deny update for different school admin', async () => {
      // Arrange
      const school1 = await createTestSchool();
      const school2 = await createTestSchool();
      const classroom = await createTestClassroom({ schoolId: school2._id });

      const params = {
        __token: generateMockToken({ 
          role: 'school_admin',
          schoolId: school1._id.toString()
        }),
        classroomId: classroom._id.toString(),
        capacity: 40
      };

      // Act
      const result = await classroomManager.update(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'FORBIDDEN');
    });
  });

  // ==========================================
  // DELETE TESTS
  // ==========================================

  describe('delete()', () => {
    it('should delete empty classroom successfully', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom = await createTestClassroom({
        schoolId: school._id,
        currentEnrollment: 0
      });

      const params = {
        __token: generateMockToken({ 
          role: 'school_admin',
          schoolId: school._id.toString()
        }),
        classroomId: classroom._id.toString()
      };

      // Act
      const result = await classroomManager.delete(params);

      // Assert
      expect(result).toHaveProperty('message');
      
      // Verify soft delete
      const deletedClassroom = await Classroom.findById(classroom._id);
      expect(deletedClassroom.isActive).toBe(false);
    });

    it('should prevent deleting classroom with active students', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom = await createTestClassroom({ schoolId: school._id });
      
      // Add a student
      await createTestStudent({
        schoolId: school._id,
        classroomId: classroom._id,
        status: 'active'
      });

      const params = {
        __token: generateMockToken({ 
          role: 'school_admin',
          schoolId: school._id.toString()
        }),
        classroomId: classroom._id.toString()
      };

      // Act
      const result = await classroomManager.delete(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'BUSINESS_ERROR');
      expect(result.error).toContain('active students');
    });
  });

  // ==========================================
  // GET STUDENTS TESTS
  // ==========================================

  describe('getStudents()', () => {
    it('should return students in classroom', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom = await createTestClassroom({ schoolId: school._id });
      
      await createTestStudent({ 
        schoolId: school._id,
        classroomId: classroom._id,
        firstName: 'Student1'
      });
      await createTestStudent({ 
        schoolId: school._id,
        classroomId: classroom._id,
        firstName: 'Student2'
      });

      const params = {
        __token: generateMockToken({ 
          role: 'school_admin',
          schoolId: school._id.toString()
        }),
        classroomId: classroom._id.toString()
      };

      // Act
      const result = await classroomManager.getStudents(params);

      // Assert
      expect(result).toHaveProperty('classroom');
      expect(result).toHaveProperty('students');
      expect(result.students).toHaveLength(2);
    });

    it('should deny access to other school classrooms', async () => {
      // Arrange
      const school1 = await createTestSchool();
      const school2 = await createTestSchool();
      const classroom = await createTestClassroom({ schoolId: school2._id });

      const params = {
        __token: generateMockToken({ 
          role: 'school_admin',
          schoolId: school1._id.toString()
        }),
        classroomId: classroom._id.toString()
      };

      // Act
      const result = await classroomManager.getStudents(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'FORBIDDEN');
    });
  });
});
