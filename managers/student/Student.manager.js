/**
 * Student Manager - TRUE AXION PATTERN
 * Pure business logic class for student management
 * Handles enrollment, transfers, and student lifecycle
 */

const { Student, Classroom, School } = require('../../loaders');
const cortex = require('../../libs/cortex');

class StudentManager {
  constructor() {
    this.Student = Student;
    this.Classroom = Classroom;
    this.School = School;
    this.cortex = cortex;
  }

  /**
   * Get all students
   * School admins see only their school's students
   * @param {Object} params
   * @param {Object} params.__token - Token metadata from cortex
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.status - Filter by status (active, transferred, etc.)
   * @param {string} params.classroomId - Filter by classroom
   * @param {string} params.search - Search by name or student ID
   */
  async getAll({ __token, page = 1, limit = 20, status, classroomId, schoolId, search }) {
    const query = {};
    
    // School admins can only see their school's students
    if (this.cortex.isSchoolAdmin(__token)) {
      query.schoolId = __token.schoolId;
    } else if (schoolId) {
      // Superadmin can filter by schoolId
      query.schoolId = schoolId;
    }
    
    // Apply filters
    if (status) {
      query.status = status;
    }
    
    if (classroomId) {
      query.classroomId = classroomId;
    }
    
    // Search by name or student ID
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [students, total] = await Promise.all([
      this.Student.find(query)
        .populate('schoolId', 'name')
        .populate('classroomId', 'name grade section')
        .populate('createdBy', 'firstName lastName')
        .limit(parseInt(limit))
        .skip(skip)
        .sort({ createdAt: -1 }),
      this.Student.countDocuments(query)
    ]);

    return {
      students,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get student by ID
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.studentId or params.id
   */
  async getById({ __token, studentId, id }) {
    const targetId = studentId || id;

    const student = await this.Student.findById(targetId)
      .populate('schoolId', 'name contactInfo')
      .populate('classroomId', 'name grade section capacity teacher')
      .populate('createdBy', 'firstName lastName');

    if (!student) {
      return {
        error: 'Student not found',
        code: 'NOT_FOUND'
      };
    }
    
    // Check access permissions
    if (!this.cortex.canAccessSchool(__token, student.schoolId._id)) {
      return {
        error: 'Access denied to this student',
        code: 'FORBIDDEN'
      };
    }

    return { student };
  }

  /**
   * Create new student (enroll)
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.schoolId
   * @param {string} params.classroomId
   * @param {string} params.firstName
   * @param {string} params.lastName
   * @param {Date} params.dateOfBirth
   * @param {string} params.gender
   * @param {Object} params.contactInfo
   * @param {Object} params.guardian - Required
   * @param {Object} params.academicInfo
   */
  async create({ 
    __token, 
    schoolId, 
    classroomId, 
    firstName, 
    lastName, 
    dateOfBirth, 
    gender, 
    contactInfo, 
    guardian, 
    academicInfo 
  }) {
    // Check if school admin can enroll in this school
    if (!this.cortex.canAccessSchool(__token, schoolId)) {
      return {
        error: 'Access denied to this school',
        code: 'FORBIDDEN'
      };
    }

    // Verify classroom exists and belongs to the school
    const classroom = await this.Classroom.findById(classroomId);
    
    if (!classroom) {
      return {
        error: 'Classroom not found',
        code: 'NOT_FOUND'
      };
    }
    
    // Verify classroom belongs to the specified school
    if (classroom.schoolId.toString() !== schoolId) {
      return {
        error: 'Classroom does not belong to this school',
        code: 'INVALID_OPERATION'
      };
    }
    
    // Check classroom capacity
    if (classroom.currentEnrollment >= classroom.capacity) {
      return {
        error: `Classroom is at full capacity (${classroom.capacity}/${classroom.capacity})`,
        code: 'CAPACITY_FULL'
      };
    }

    // Create student
    const student = await this.Student.create({
      schoolId,
      classroomId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      contactInfo,
      guardian,
      academicInfo,
      createdBy: __token.userId
    });

    // Increment classroom enrollment
    classroom.currentEnrollment += 1;
    await classroom.save();

    // Populate references
    await student.populate('schoolId', 'name');
    await student.populate('classroomId', 'name grade section');
    await student.populate('createdBy', 'firstName lastName');

    return {
      student,
      message: 'Student enrolled successfully'
    };
  }

  /**
   * Update student
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.studentId or params.id
   * @param {...Object} updateData - Fields to update
   */
  async update({ __token, studentId, id, ...updateData }) {
    const targetId = studentId || id;

    const student = await this.Student.findById(targetId);
    
    if (!student) {
      return {
        error: 'Student not found',
        code: 'NOT_FOUND'
      };
    }
    
    // Check access permissions
    if (!this.cortex.canAccessSchool(__token, student.schoolId)) {
      return {
        error: 'Access denied to this student',
        code: 'FORBIDDEN'
      };
    }

    // If changing classroom, handle enrollment counts
    if (updateData.classroomId && updateData.classroomId !== student.classroomId.toString()) {
      const newClassroom = await this.Classroom.findById(updateData.classroomId);
      
      if (!newClassroom) {
        return {
          error: 'New classroom not found',
          code: 'NOT_FOUND'
        };
      }
      
      // Check capacity
      if (newClassroom.currentEnrollment >= newClassroom.capacity) {
        return {
          error: `New classroom is at full capacity (${newClassroom.capacity}/${newClassroom.capacity})`,
          code: 'CAPACITY_FULL'
        };
      }
      
      // Verify new classroom is in same school
      if (newClassroom.schoolId.toString() !== student.schoolId.toString()) {
        return {
          error: 'New classroom must be in the same school',
          code: 'INVALID_OPERATION'
        };
      }

      // Update enrollment counts
      const oldClassroom = await this.Classroom.findById(student.classroomId);
      if (oldClassroom) {
        oldClassroom.currentEnrollment -= 1;
        await oldClassroom.save();
      }
      
      newClassroom.currentEnrollment += 1;
      await newClassroom.save();
    }

    // Update student
    Object.assign(student, updateData);
    await student.save();

    // Populate references
    await student.populate('schoolId', 'name');
    await student.populate('classroomId', 'name grade section');

    return {
      student,
      message: 'Student updated successfully'
    };
  }

  /**
   * Delete student (withdraw/soft delete)
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.studentId or params.id
   */
  async delete({ __token, studentId, id }) {
    const targetId = studentId || id;

    const student = await this.Student.findById(targetId);
    
    if (!student) {
      return {
        error: 'Student not found',
        code: 'NOT_FOUND'
      };
    }
    
    // Check access permissions
    if (!this.cortex.canAccessSchool(__token, student.schoolId)) {
      return {
        error: 'Access denied to this student',
        code: 'FORBIDDEN'
      };
    }

    // Update status to withdrawn
    student.status = 'withdrawn';
    await student.save();

    // Decrement classroom enrollment
    const classroom = await this.Classroom.findById(student.classroomId);
    if (classroom && classroom.currentEnrollment > 0) {
      classroom.currentEnrollment -= 1;
      await classroom.save();
    }

    return {
      message: 'Student withdrawn successfully'
    };
  }

  /**
   * Transfer student to another classroom
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.studentId or params.id
   * @param {string} params.newClassroomId - Target classroom ID
   * @param {string} params.reason - Reason for transfer
   */
  async transfer({ __token, studentId, id, newClassroomId, reason }) {
    const targetId = studentId || id;

    const student = await this.Student.findById(targetId);
    
    if (!student) {
      return {
        error: 'Student not found',
        code: 'NOT_FOUND'
      };
    }
    
    // Check access permissions
    if (!this.cortex.canAccessSchool(__token, student.schoolId)) {
      return {
        error: 'Access denied to this student',
        code: 'FORBIDDEN'
      };
    }

    // Get old and new classrooms
    const oldClassroom = await this.Classroom.findById(student.classroomId);
    const newClassroom = await this.Classroom.findById(newClassroomId);

    if (!newClassroom) {
      return {
        error: 'New classroom not found',
        code: 'NOT_FOUND'
      };
    }

    // Verify new classroom is in same school
    if (newClassroom.schoolId.toString() !== student.schoolId.toString()) {
      return {
        error: 'Can only transfer students within the same school',
        code: 'INVALID_OPERATION'
      };
    }

    // Check if already in target classroom
    if (student.classroomId.toString() === newClassroomId) {
      return {
        error: 'Student is already in this classroom',
        code: 'INVALID_OPERATION'
      };
    }

    // Check capacity of new classroom
    if (newClassroom.currentEnrollment >= newClassroom.capacity) {
      return {
        error: `New classroom is at full capacity (${newClassroom.capacity}/${newClassroom.capacity})`,
        code: 'CAPACITY_FULL'
      };
    }

    // Update enrollment counts
    if (oldClassroom) {
      oldClassroom.currentEnrollment -= 1;
      await oldClassroom.save();
    }
    
    newClassroom.currentEnrollment += 1;
    await newClassroom.save();

    // Add to transfer history
    student.transferHistory.push({
      fromSchool: oldClassroom ? `${oldClassroom.name} (${oldClassroom.grade}-${oldClassroom.section})` : 'Unknown',
      date: new Date(),
      reason: reason || 'Classroom transfer'
    });

    // Update classroom
    student.classroomId = newClassroomId;
    await student.save();

    // Populate references
    await student.populate('schoolId', 'name');
    await student.populate('classroomId', 'name grade section');

    return {
      student,
      message: 'Student transferred successfully',
      transfer: {
        from: oldClassroom ? `${oldClassroom.name}` : 'Unknown',
        to: `${newClassroom.name}`,
        date: new Date(),
        reason: reason || 'Classroom transfer'
      }
    };
  }

  /**
   * Get students by classroom
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.classroomId
   */
  async getByClassroom({ __token, classroomId }) {
    // Verify classroom exists and check access
    const classroom = await this.Classroom.findById(classroomId);
    
    if (!classroom) {
      return {
        error: 'Classroom not found',
        code: 'NOT_FOUND'
      };
    }
    
    if (!this.cortex.canAccessSchool(__token, classroom.schoolId)) {
      return {
        error: 'Access denied to this classroom',
        code: 'FORBIDDEN'
      };
    }

    const students = await this.Student.find({
      classroomId,
      status: 'active'
    }).sort({ lastName: 1, firstName: 1 });

    return {
      classroom: {
        id: classroom._id,
        name: classroom.name,
        grade: classroom.grade,
        section: classroom.section,
        capacity: classroom.capacity,
        currentEnrollment: classroom.currentEnrollment
      },
      students,
      count: students.length
    };
  }

  /**
   * Get students by school
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.schoolId
   */
  async getBySchool({ __token, schoolId }) {
    if (!this.cortex.canAccessSchool(__token, schoolId)) {
      return {
        error: 'Access denied to this school',
        code: 'FORBIDDEN'
      };
    }

    const students = await this.Student.find({
      schoolId,
      status: 'active'
    })
    .populate('classroomId', 'name grade section')
    .sort({ lastName: 1, firstName: 1 });

    return {
      students,
      count: students.length
    };
  }
}

// AXION PATTERN: Export class, NOT instance
module.exports = StudentManager;
