/**
 * School Manager - 
 * Pure business logic class for school management
 * No req/res - receives unified params with __ metadata
 * Returns data objects - cortex handles HTTP
 */

const { School, Classroom, Student } = require('../../loaders');
const cortex = require('../../libs/cortex');

class SchoolManager {
  constructor() {
    this.School = School;
    this.Classroom = Classroom;
    this.Student = Student;
    this.cortex = cortex;
  }

  /**
   * Get all schools (Superadmin only)
   * @param {Object} params
   * @param {Object} params.__token - Token metadata from cortex
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search query
   */
  async getAll({ __token, page = 1, limit = 20, search }) {
    // Check superadmin permission
    if (!this.cortex.isSuperadmin(__token)) {
      return {
        error: 'Only superadmins can list all schools',
        code: 'FORBIDDEN'
      };
    }

    const query = { isActive: true };
    
    // Add search filter
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [schools, total] = await Promise.all([
      this.School.find(query)
        .populate('createdBy', 'firstName lastName email')
        .limit(parseInt(limit))
        .skip(skip)
        .sort({ createdAt: -1 }),
      this.School.countDocuments(query)
    ]);

    return {
      schools,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get school by ID
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.schoolId or params.id
   */
  async getById({ __token, schoolId, id }) {
    const targetId = schoolId || id;

    // Check access permissions
    if (!this.cortex.canAccessSchool(__token, targetId)) {
      return {
        error: 'Access denied to this school',
        code: 'FORBIDDEN'
      };
    }

    const school = await this.School.findById(targetId)
      .populate('createdBy', 'firstName lastName email');

    if (!school) {
      return {
        error: 'School not found',
        code: 'NOT_FOUND'
      };
    }

    return { school };
  }

  /**
   * Create new school (Superadmin only)
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.name
   * @param {Object} params.contactInfo
   * @param {Object} params.address
   */
  async create({ __token, name, contactInfo, address, establishedYear, principalName, totalCapacity }) {
    // Check superadmin permission
    if (!this.cortex.isSuperadmin(__token)) {
      return {
        error: 'Only superadmins can create schools',
        code: 'FORBIDDEN'
      };
    }

    const school = await this.School.create({
      name,
      contactInfo,
      address,
      establishedYear,
      principalName,
      totalCapacity,
      createdBy: __token.userId
    });

    await school.populate('createdBy', 'firstName lastName email');

    return {
      school,
      message: 'School created successfully'
    };
  }

  /**
   * Update school (Superadmin only)
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.schoolId or params.id
   * @param {...Object} updateData - Fields to update
   */
  async update({ __token, schoolId, id, ...updateData }) {
    // Check superadmin permission
    if (!this.cortex.isSuperadmin(__token)) {
      return {
        error: 'Only superadmins can update schools',
        code: 'FORBIDDEN'
      };
    }

    const targetId = schoolId || id;

    const school = await this.School.findByIdAndUpdate(
      targetId,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email');

    if (!school) {
      return {
        error: 'School not found',
        code: 'NOT_FOUND'
      };
    }

    return {
      school,
      message: 'School updated successfully'
    };
  }

  /**
   * Delete school - soft delete (Superadmin only)
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.schoolId or params.id
   */
  async delete({ __token, schoolId, id }) {
    // Check superadmin permission
    if (!this.cortex.isSuperadmin(__token)) {
      return {
        error: 'Only superadmins can delete schools',
        code: 'FORBIDDEN'
      };
    }

    const targetId = schoolId || id;

    const school = await this.School.findByIdAndUpdate(
      targetId,
      { isActive: false },
      { new: true }
    );

    if (!school) {
      return {
        error: 'School not found',
        code: 'NOT_FOUND'
      };
    }

    return {
      message: 'School deleted successfully'
    };
  }

  /**
   * Get school statistics
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.schoolId or params.id
   */
  async getStats({ __token, schoolId, id }) {
    const targetId = schoolId || id;

    // Check access permissions
    if (!this.cortex.canAccessSchool(__token, targetId)) {
      return {
        error: 'Access denied to this school',
        code: 'FORBIDDEN'
      };
    }

    const school = await this.School.findById(targetId);

    if (!school) {
      return {
        error: 'School not found',
        code: 'NOT_FOUND'
      };
    }

    // Get statistics in parallel
    const [classroomCount, studentCount] = await Promise.all([
      this.Classroom.countDocuments({ schoolId: targetId, isActive: true }),
      this.Student.countDocuments({ schoolId: targetId, status: 'active' })
    ]);

    return {
      school,
      stats: {
        classrooms: classroomCount,
        students: studentCount,
        capacity: school.totalCapacity,
        utilizationRate: school.totalCapacity 
          ? ((studentCount / school.totalCapacity) * 100).toFixed(2) 
          : 0
      }
    };
  }
}

// Export class, NOT instance
module.exports = SchoolManager;
