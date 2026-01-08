/**
 * Classroom Manager 
 * Pure business logic class for classroom management
 */

const { Classroom, School, Student } = require('../../loaders');
const cortex = require('../../libs/cortex');

class ClassroomManager {
  constructor() {
    this.Classroom = Classroom;
    this.School = School;
    this.Student = Student;
    this.cortex = cortex;
  }

  /**
   * Get all classrooms
   * School admins see only their school's classrooms
   * @param {Object} params
   * @param {Object} params.__token
   * @param {number} params.page
   * @param {number} params.limit
   * @param {string} params.schoolId - Optional filter
   */
  async getAll({ __token, page = 1, limit = 20, schoolId }) {
    const query = { isActive: true };
    
    // School admins can only see their school's classrooms
    if (this.cortex.isSchoolAdmin(__token)) {
      query.schoolId = __token.schoolId;
    } else if (schoolId) {
      // Superadmin can filter by schoolId
      query.schoolId = schoolId;
    }

    const skip = (page - 1) * limit;

    const [classrooms, total] = await Promise.all([
      this.Classroom.find(query)
        .populate('schoolId', 'name')
        .populate('createdBy', 'firstName lastName')
        .limit(parseInt(limit))
        .skip(skip)
        .sort({ createdAt: -1 }),
      this.Classroom.countDocuments(query)
    ]);

    return {
      classrooms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get classroom by ID
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.classroomId or params.id
   */
  async getById({ __token, classroomId, id }) {
    const targetId = classroomId || id;

    const classroom = await this.Classroom.findById(targetId)
      .populate('schoolId', 'name contactInfo')
      .populate('createdBy', 'firstName lastName');
    
    if (!classroom) {
      return {
        error: 'Classroom not found',
        code: 'NOT_FOUND'
      };
    }
    
    // Check access permissions
    if (!this.cortex.canAccessSchool(__token, classroom.schoolId._id)) {
      return {
        error: 'Access denied to this classroom',
        code: 'FORBIDDEN'
      };
    }

    // Get current students count
    const studentCount = await this.Student.countDocuments({
      classroomId: targetId,
      status: 'active'
    });

    return {
      classroom: {
        ...classroom.toObject(),
        currentStudents: studentCount
      }
    };
  }

  /**
   * Create new classroom
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.schoolId
   * @param {string} params.name
   * @param {number} params.grade
   * @param {string} params.section
   * @param {number} params.capacity
   */
  async create({ __token, schoolId, name, grade, section, capacity, roomNumber, teacher, subjects }) {
    // Check if school admin can create in this school
    if (!this.cortex.canAccessSchool(__token, schoolId)) {
      return {
        error: 'Access denied to this school',
        code: 'FORBIDDEN'
      };
    }

    // Verify school exists
    const school = await this.School.findById(schoolId);
    if (!school) {
      return {
        error: 'School not found',
        code: 'NOT_FOUND'
      };
    }

    // Create classroom
    const classroom = await this.Classroom.create({
      schoolId,
      name,
      grade,
      section,
      capacity,
      roomNumber,
      teacher,
      subjects,
      createdBy: __token.userId
    });

    await classroom.populate('schoolId', 'name');
    await classroom.populate('createdBy', 'firstName lastName');

    return {
      classroom,
      message: 'Classroom created successfully'
    };
  }

  /**
   * Update classroom
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.classroomId or params.id
   * @param {...Object} updateData
   */
  async update({ __token, classroomId, id, ...updateData }) {
    const targetId = classroomId || id;

    const classroom = await this.Classroom.findById(targetId);
    
    if (!classroom) {
      return {
        error: 'Classroom not found',
        code: 'NOT_FOUND'
      };
    }
    
    // Check access permissions
    if (!this.cortex.canAccessSchool(__token, classroom.schoolId)) {
      return {
        error: 'Access denied to this classroom',
        code: 'FORBIDDEN'
      };
    }

    // If reducing capacity, check if it's below current enrollment
    if (updateData.capacity && updateData.capacity < classroom.currentEnrollment) {
      return {
        error: `Cannot reduce capacity below current enrollment (${classroom.currentEnrollment} students)`,
        code: 'BUSINESS_ERROR'
      };
    }

    // Update classroom
    Object.assign(classroom, updateData);
    await classroom.save();

    await classroom.populate('schoolId', 'name');
    await classroom.populate('createdBy', 'firstName lastName');

    return {
      classroom,
      message: 'Classroom updated successfully'
    };
  }

  /**
   * Delete classroom (soft delete)
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.classroomId or params.id
   */
  async delete({ __token, classroomId, id }) {
    const targetId = classroomId || id;

    const classroom = await this.Classroom.findById(targetId);
    
    if (!classroom) {
      return {
        error: 'Classroom not found',
        code: 'NOT_FOUND'
      };
    }
    
    // Check access permissions
    if (!this.cortex.canAccessSchool(__token, classroom.schoolId)) {
      return {
        error: 'Access denied to this classroom',
        code: 'FORBIDDEN'
      };
    }

    // Check if classroom has active students
    const activeStudents = await this.Student.countDocuments({
      classroomId: targetId,
      status: 'active'
    });

    if (activeStudents > 0) {
      return {
        error: `Cannot delete classroom with ${activeStudents} active students. Please transfer students first.`,
        code: 'BUSINESS_ERROR'
      };
    }

    // Soft delete
    classroom.isActive = false;
    await classroom.save();

    return {
      message: 'Classroom deleted successfully'
    };
  }

  /**
   * Get students in classroom
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.classroomId or params.id
   */
  async getStudents({ __token, classroomId, id }) {
    const targetId = classroomId || id;

    const classroom = await this.Classroom.findById(targetId);
    
    if (!classroom) {
      return {
        error: 'Classroom not found',
        code: 'NOT_FOUND'
      };
    }
    
    // Check access permissions
    if (!this.cortex.canAccessSchool(__token, classroom.schoolId)) {
      return {
        error: 'Access denied to this classroom',
        code: 'FORBIDDEN'
      };
    }

    const students = await this.Student.find({
      classroomId: targetId,
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
      students
    };
  }
}

// Export class, NOT instance
module.exports = ClassroomManager;
