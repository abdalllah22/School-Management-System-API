/**
 * Student Manager Unit Tests
 * 
 * Testing complex business logic:
 * - Enrollment with capacity checks
 * - Transfers with history tracking
 * - Enrollment count management
 */

const StudentManager = require('../../managers/student/Student.manager');
const { Classroom } = require('../../loaders');
const {
  createTestUser,
  createTestSchool,
  createTestClassroom,
  createTestStudent
} = require('../helpers/factories');

describe('Student Manager', () => {
  let studentManager;

  beforeEach(() => {
    studentManager = new StudentManager();
  });

  // ==========================================
  // CREATE (ENROLLMENT) TESTS
  // ==========================================

  describe('create() - Student Enrollment', () => {
    it('should enroll student successfully', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom = await createTestClassroom({ 
        schoolId: school._id,
        capacity: 30,
        currentEnrollment: 0
      });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school._id
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school._id.toString()
        },
        schoolId: school._id.toString(),
        classroomId: classroom._id.toString(),
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('2010-01-01'),
        guardian: {
          name: 'Jane Doe',
          phone: '+1-555-0123'
        }
      };

      // Act
      const result = await studentManager.create(params);

      // Assert
      expect(result).toHaveProperty('student');
      expect(result).toHaveProperty('message');
      expect(result.student.firstName).toBe('John');
      expect(result.student.lastName).toBe('Doe');
      expect(result.student.studentId).toMatch(/^STU/);
      expect(result.student.status).toBe('active');
    });

    it('should increment classroom enrollment count', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom = await createTestClassroom({ 
        schoolId: school._id,
        capacity: 30,
        currentEnrollment: 10
      });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school._id
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school._id.toString()
        },
        schoolId: school._id.toString(),
        classroomId: classroom._id.toString(),
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('2010-01-01'),
        guardian: { name: 'Jane Doe', phone: '+1-555-0123' }
      };

      // Act
      await studentManager.create(params);

      // Assert - Check enrollment increased
      const updatedClassroom = await Classroom.findById(classroom._id);
      expect(updatedClassroom.currentEnrollment).toBe(11);
    });

    it('should reject enrollment if classroom is full', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom = await createTestClassroom({ 
        schoolId: school._id,
        capacity: 30,
        currentEnrollment: 30 // FULL!
      });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school._id
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school._id.toString()
        },
        schoolId: school._id.toString(),
        classroomId: classroom._id.toString(),
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('2010-01-01'),
        guardian: { name: 'Jane Doe', phone: '+1-555-0123' }
      };

      // Act
      const result = await studentManager.create(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'CAPACITY_FULL');
      expect(result.error).toContain('full capacity');
    });

    it('should reject enrollment if classroom not in school', async () => {
      // Arrange
      const school1 = await createTestSchool();
      const school2 = await createTestSchool();
      const classroom = await createTestClassroom({ schoolId: school2._id });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school1._id
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school1._id.toString()
        },
        schoolId: school1._id.toString(), // Different school!
        classroomId: classroom._id.toString(),
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('2010-01-01'),
        guardian: { name: 'Jane Doe', phone: '+1-555-0123' }
      };

      // Act
      const result = await studentManager.create(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'INVALID_OPERATION');
    });

    it('should deny access to school admin from different school', async () => {
      // Arrange
      const school1 = await createTestSchool();
      const school2 = await createTestSchool();
      const classroom = await createTestClassroom({ schoolId: school2._id });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school1._id // Admin from school1
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school1._id.toString()
        },
        schoolId: school2._id.toString(), // Trying to enroll in school2
        classroomId: classroom._id.toString(),
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('2010-01-01'),
        guardian: { name: 'Jane Doe', phone: '+1-555-0123' }
      };

      // Act
      const result = await studentManager.create(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'FORBIDDEN');
    });

    it('should auto-generate unique student ID', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom = await createTestClassroom({ schoolId: school._id });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school._id
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school._id.toString()
        },
        schoolId: school._id.toString(),
        classroomId: classroom._id.toString(),
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('2010-01-01'),
        guardian: { name: 'Jane Doe', phone: '+1-555-0123' }
      };

      // Act
      const result = await studentManager.create(params);

      // Assert
      expect(result.student.studentId).toBeTruthy();
      expect(result.student.studentId).toMatch(/^STU[a-zA-Z0-9]{10}$/);
    });
  });

  // ==========================================
  // TRANSFER TESTS
  // ==========================================

  describe('transfer() - Classroom Transfer', () => {
    it('should transfer student between classrooms successfully', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom1 = await createTestClassroom({ 
        schoolId: school._id,
        currentEnrollment: 10,
        capacity: 30
      });
      const classroom2 = await createTestClassroom({ 
        schoolId: school._id,
        currentEnrollment: 15,
        capacity: 30
      });
      const student = await createTestStudent({
        schoolId: school._id,
        classroomId: classroom1._id
      });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school._id
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school._id.toString()
        },
        studentId: student._id.toString(),
        newClassroomId: classroom2._id.toString(),
        reason: 'Grade promotion'
      };

      // Act
      const result = await studentManager.transfer(params);

      // Assert
      expect(result).toHaveProperty('student');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('transfer');
      expect(result.student.classroomId._id.toString()).toBe(classroom2._id.toString());
    });

    it('should update enrollment counts correctly', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom1 = await createTestClassroom({ 
        schoolId: school._id,
        currentEnrollment: 10,
        capacity: 30
      });
      const classroom2 = await createTestClassroom({ 
        schoolId: school._id,
        currentEnrollment: 15,
        capacity: 30
      });
      const student = await createTestStudent({
        schoolId: school._id,
        classroomId: classroom1._id
      });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school._id
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school._id.toString()
        },
        studentId: student._id.toString(),
        newClassroomId: classroom2._id.toString(),
        reason: 'Grade promotion'
      };

      // Act
      await studentManager.transfer(params);

      // Assert
      const updatedClassroom1 = await Classroom.findById(classroom1._id);
      const updatedClassroom2 = await Classroom.findById(classroom2._id);
      
      expect(updatedClassroom1.currentEnrollment).toBe(9);  // 10 - 1
      expect(updatedClassroom2.currentEnrollment).toBe(16); // 15 + 1
    });

    it('should add entry to transfer history', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom1 = await createTestClassroom({ 
        schoolId: school._id,
        name: 'Grade 5-A'
      });
      const classroom2 = await createTestClassroom({ 
        schoolId: school._id,
        name: 'Grade 6-A'
      });
      const student = await createTestStudent({
        schoolId: school._id,
        classroomId: classroom1._id
      });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school._id
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school._id.toString()
        },
        studentId: student._id.toString(),
        newClassroomId: classroom2._id.toString(),
        reason: 'Grade promotion'
      };

      // Act
      const result = await studentManager.transfer(params);

      // Assert
      expect(result.student.transferHistory).toHaveLength(1);
      expect(result.student.transferHistory[0].reason).toBe('Grade promotion');
    });

    it('should reject transfer if new classroom is full', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom1 = await createTestClassroom({ 
        schoolId: school._id,
        currentEnrollment: 10
      });
      const classroom2 = await createTestClassroom({ 
        schoolId: school._id,
        currentEnrollment: 30,
        capacity: 30 // FULL!
      });
      const student = await createTestStudent({
        schoolId: school._id,
        classroomId: classroom1._id
      });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school._id
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school._id.toString()
        },
        studentId: student._id.toString(),
        newClassroomId: classroom2._id.toString(),
        reason: 'Transfer attempt'
      };

      // Act
      const result = await studentManager.transfer(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'CAPACITY_FULL');
    });

    it('should reject transfer to different school', async () => {
      // Arrange
      const school1 = await createTestSchool();
      const school2 = await createTestSchool();
      const classroom1 = await createTestClassroom({ schoolId: school1._id });
      const classroom2 = await createTestClassroom({ schoolId: school2._id });
      const student = await createTestStudent({
        schoolId: school1._id,
        classroomId: classroom1._id
      });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school1._id
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school1._id.toString()
        },
        studentId: student._id.toString(),
        newClassroomId: classroom2._id.toString()
      };

      // Act
      const result = await studentManager.transfer(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'INVALID_OPERATION');
      expect(result.error).toContain('same school');
    });

    it('should reject transfer to same classroom', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom = await createTestClassroom({ schoolId: school._id });
      const student = await createTestStudent({
        schoolId: school._id,
        classroomId: classroom._id
      });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school._id
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school._id.toString()
        },
        studentId: student._id.toString(),
        newClassroomId: classroom._id.toString() // Same classroom!
      };

      // Act
      const result = await studentManager.transfer(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'INVALID_OPERATION');
      expect(result.error).toContain('already in this classroom');
    });
  });

  // ==========================================
  // DELETE (WITHDRAW) TESTS
  // ==========================================

  describe('delete() - Student Withdrawal', () => {
    it('should withdraw student successfully', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom = await createTestClassroom({ 
        schoolId: school._id,
        currentEnrollment: 10
      });
      const student = await createTestStudent({
        schoolId: school._id,
        classroomId: classroom._id,
        status: 'active'
      });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school._id
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school._id.toString()
        },
        studentId: student._id.toString()
      };

      // Act
      const result = await studentManager.delete(params);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('withdrawn');
    });

    it('should decrement classroom enrollment', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom = await createTestClassroom({ 
        schoolId: school._id,
        currentEnrollment: 10
      });
      const student = await createTestStudent({
        schoolId: school._id,
        classroomId: classroom._id
      });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school._id
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school._id.toString()
        },
        studentId: student._id.toString()
      };

      // Act
      await studentManager.delete(params);

      // Assert
      const updatedClassroom = await Classroom.findById(classroom._id);
      expect(updatedClassroom.currentEnrollment).toBe(9); // 10 - 1
    });

    it('should change status to withdrawn', async () => {
      // Arrange
      const school = await createTestSchool();
      const classroom = await createTestClassroom({ schoolId: school._id });
      const student = await createTestStudent({
        schoolId: school._id,
        classroomId: classroom._id,
        status: 'active'
      });
      const admin = await createTestUser({ 
        role: 'school_admin',
        schoolId: school._id
      });

      const params = {
        __token: {
          userId: admin._id.toString(),
          role: 'school_admin',
          schoolId: school._id.toString()
        },
        studentId: student._id.toString()
      };

      // Act
      await studentManager.delete(params);

      // Assert
      const { Student } = require('../../loaders');
      const updatedStudent = await Student.findById(student._id);
      expect(updatedStudent.status).toBe('withdrawn');
    });
  });
});
