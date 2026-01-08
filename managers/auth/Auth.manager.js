/**
 * Auth Manager 
 * 
 * Pure business logic class for authentication
 * - No req/res parameters
 * - Receives unified params object with __ metadata
 * - Returns data objects (not HTTP responses)
 * - Cortex handles all HTTP concerns
 */

const { User } = require('../../loaders');
const cortex = require('../../libs/cortex');

class Auth {
  constructor() {
    this.cortex = cortex;
    this.User = User;
  }

  /**
   * Register new user
   * @param {Object} params - Unified params from cortex
   * @param {string} params.email
   * @param {string} params.password
   * @param {string} params.firstName
   * @param {string} params.lastName
   * @param {string} params.role - 'superadmin' or 'school_admin'
   * @param {string} params.schoolId - Required if role is school_admin
   * @param {Object} params.__token - Token metadata (optional for public route)
   * @param {Object} params.__headers - HTTP headers
   */
  async register({ email, password, firstName, lastName, role, schoolId, __token, __headers }) {
    try {
      // Check if user already exists
      const existingUser = await this.User.findOne({ email });
      if (existingUser) {
        return {
          error: 'User with this email already exists',
          code: 'USER_EXISTS'
        };
      }

      // Prepare user data
      const userData = {
        email,
        password,
        firstName,
        lastName,
        role
      };

      // Add schoolId for school_admin
      if (role === 'school_admin' && schoolId) {
        userData.schoolId = schoolId;
      }

      // Create user
      const user = await this.User.create(userData);

      // Generate tokens
      const accessToken = this.cortex.generateToken({
        userId: user._id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId
      });

      const refreshToken = this.cortex.generateRefreshToken({
        userId: user._id,
        email: user.email
      });

      // Return success response
      return {
        user: user.toJSON(),
        accessToken,
        refreshToken,
        message: 'User registered successfully'
      };
    } catch (error) {
      console.error('Register error:', error);
      throw error; // Let cortex handle the error
    }
  }

  /**
   * Login user
   * @param {Object} params
   * @param {string} params.email
   * @param {string} params.password
   * @param {Object} params.__headers
   * @param {string} params.__device
   * @param {string} params.__ip
   */
  async login({ email, password, __headers, __device, __ip }) {
    try {
      // Find user with password field
      const user = await this.User.findOne({ email }).select('+password');
      
      if (!user) {
        return {
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        };
      }

      // Check if account is active
      if (!user.isActive) {
        return {
          error: 'Account has been deactivated',
          code: 'ACCOUNT_INACTIVE'
        };
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return {
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        };
      }

      // Generate tokens
      const accessToken = this.cortex.generateToken({
        userId: user._id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId
      });

      const refreshToken = this.cortex.generateRefreshToken({
        userId: user._id,
        email: user.email
      });

      // Remove password from response
      user.password = undefined;

      return {
        user: user.toJSON(),
        accessToken,
        refreshToken,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   * @param {Object} params
   * @param {Object} params.__token - Token metadata from cortex
   */
  async getMe({ __token }) {
    try {
      if (!__token || !__token.userId) {
        return {
          error: 'Authentication required',
          code: 'NO_AUTH'
        };
      }

      const user = await this.User.findById(__token.userId)
        .populate('schoolId', 'name contactInfo');
      
      if (!user) {
        return {
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      return {
        user: user.toJSON()
      };
    } catch (error) {
      console.error('Get me error:', error);
      throw error;
    }
  }

  /**
   * Update current user profile
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.firstName
   * @param {string} params.lastName
   */
  async updateProfile({ __token, firstName, lastName }) {
    try {
      if (!__token || !__token.userId) {
        return {
          error: 'Authentication required',
          code: 'NO_AUTH'
        };
      }

      const updateData = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;

      const user = await this.User.findByIdAndUpdate(
        __token.userId,
        updateData,
        { new: true, runValidators: true }
      ).populate('schoolId', 'name');

      if (!user) {
        return {
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      return {
        user: user.toJSON(),
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Change password
   * @param {Object} params
   * @param {Object} params.__token
   * @param {string} params.currentPassword
   * @param {string} params.newPassword
   */
  async changePassword({ __token, currentPassword, newPassword }) {
    try {
      if (!__token || !__token.userId) {
        return {
          error: 'Authentication required',
          code: 'NO_AUTH'
        };
      }

      const user = await this.User.findById(__token.userId).select('+password');
      
      if (!user) {
        return {
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return {
          error: 'Current password is incorrect',
          code: 'INVALID_PASSWORD'
        };
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return {
        message: 'Password changed successfully'
      };
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }
}

// AXION PATTERN: Export class, NOT instance
module.exports = Auth;
