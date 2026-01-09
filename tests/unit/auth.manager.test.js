/**
 * Auth Manager Unit Tests
 */

const AuthManager = require('../../managers/auth/Auth.manager');
const { User } = require('../../loaders');
const { createTestUser, generateMockToken } = require('../helpers/factories');

describe('Auth Manager', () => {
  let authManager;

  beforeEach(() => {
    // Create fresh instance for each test
    authManager = new AuthManager();
  });

  // ==========================================
  // REGISTER TESTS
  // ==========================================

  describe('register()', () => {
    it('should register a new superadmin successfully', async () => {
      // Arrange
      const params = {
        email: 'admin@test.com',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'superadmin'
      };

      // Act
      const result = await authManager.register(params);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('message');
      expect(result.user.email).toBe('admin@test.com');
      expect(result.user.role).toBe('superadmin');
      expect(result.user.password).toBeUndefined(); // Password should be removed
    });

    it('should register a school admin with schoolId', async () => {
      // Arrange
      const params = {
        email: 'schooladmin@test.com',
        password: 'Admin123!',
        firstName: 'School',
        lastName: 'Admin',
        role: 'school_admin',
        schoolId: '507f1f77bcf86cd799439011' // Valid ObjectId
      };

      // Act
      const result = await authManager.register(params);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result.user.role).toBe('school_admin');
      expect(result.user.schoolId).toBe('507f1f77bcf86cd799439011');
    });

    it('should return error if email already exists', async () => {
      // Arrange
      await createTestUser({ email: 'existing@test.com' });

      const params = {
        email: 'existing@test.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'superadmin'
      };

      // Act
      const result = await authManager.register(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'USER_EXISTS');
      expect(result.error).toContain('already exists');
    });

    it('should hash password before storing', async () => {
      // Arrange
      const params = {
        email: 'test@test.com',
        password: 'PlainPassword123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'superadmin'
      };

      // Act
      await authManager.register(params);

      // Assert - Check password is hashed in database
      const user = await User.findOne({ email: 'test@test.com' }).select('+password');
      expect(user.password).not.toBe('PlainPassword123!');
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it('should generate valid JWT tokens', async () => {
      // Arrange
      const params = {
        email: 'test@test.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'superadmin'
      };

      // Act
      const result = await authManager.register(params);

      // Assert
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      
      // Tokens should be different
      expect(result.accessToken).not.toBe(result.refreshToken);
    });
  });

  // ==========================================
  // LOGIN TESTS
  // ==========================================

  describe('login()', () => {
    it('should login successfully with correct credentials', async () => {
      // Arrange
      const user = await createTestUser({
        email: 'user@test.com',
        password: 'Correct123!'
      });

      const params = {
        email: 'user@test.com',
        password: 'Correct123!',
        __headers: { 'user-agent': 'Test Browser' },
        __device: 'Test Device',
        __ip: '127.0.0.1'
      };

      // Act
      const result = await authManager.login(params);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('message', 'Login successful');
      expect(result.user.email).toBe('user@test.com');
    });

    it('should return error for non-existent user', async () => {
      // Arrange
      const params = {
        email: 'nonexistent@test.com',
        password: 'Test123!'
      };

      // Act
      const result = await authManager.login(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'INVALID_CREDENTIALS');
      expect(result.error).toContain('Invalid email or password');
    });

    it('should return error for incorrect password', async () => {
      // Arrange
      await createTestUser({
        email: 'user@test.com',
        password: 'CorrectPassword123!'
      });

      const params = {
        email: 'user@test.com',
        password: 'WrongPassword123!'
      };

      // Act
      const result = await authManager.login(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('should return error for inactive account', async () => {
      // Arrange
      await createTestUser({
        email: 'inactive@test.com',
        password: 'Test123!',
        isActive: false
      });

      const params = {
        email: 'inactive@test.com',
        password: 'Test123!'
      };

      // Act
      const result = await authManager.login(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'ACCOUNT_INACTIVE');
      expect(result.error).toContain('deactivated');
    });

    it('should not return password in response', async () => {
      // Arrange
      await createTestUser({
        email: 'user@test.com',
        password: 'Test123!'
      });

      const params = {
        email: 'user@test.com',
        password: 'Test123!'
      };

      // Act
      const result = await authManager.login(params);

      // Assert
      expect(result.user.password).toBeUndefined();
    });
  });

  // ==========================================
  // GET ME TESTS
  // ==========================================

  describe('getMe()', () => {
    it('should return current user profile', async () => {
      // Arrange
      const user = await createTestUser({
        email: 'test@test.com',
        firstName: 'John',
        lastName: 'Doe'
      });

      const params = {
        __token: {
          userId: user._id.toString(),
          email: user.email,
          role: user.role
        }
      };

      // Act
      const result = await authManager.getMe(params);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@test.com');
      expect(result.user.firstName).toBe('John');
      expect(result.user.lastName).toBe('Doe');
    });

    it('should return error if no token', async () => {
      // Arrange
      const params = {};

      // Act
      const result = await authManager.getMe(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'NO_AUTH');
    });

    it('should return error if user not found', async () => {
      // Arrange
      const params = {
        __token: {
          userId: '507f1f77bcf86cd799439011', // Non-existent ID
          email: 'test@test.com',
          role: 'superadmin'
        }
      };

      // Act
      const result = await authManager.getMe(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'USER_NOT_FOUND');
    });
  });

  // ==========================================
  // UPDATE PROFILE TESTS
  // ==========================================

  describe('updateProfile()', () => {
    it('should update user firstName', async () => {
      // Arrange
      const user = await createTestUser({
        firstName: 'OldFirst',
        lastName: 'OldLast'
      });

      const params = {
        __token: {
          userId: user._id.toString(),
          email: user.email,
          role: user.role
        },
        firstName: 'NewFirst'
      };

      // Act
      const result = await authManager.updateProfile(params);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('message');
      expect(result.user.firstName).toBe('NewFirst');
      expect(result.user.lastName).toBe('OldLast'); // Should not change
    });

    it('should update user lastName', async () => {
      // Arrange
      const user = await createTestUser({
        firstName: 'John',
        lastName: 'OldLast'
      });

      const params = {
        __token: {
          userId: user._id.toString()
        },
        lastName: 'NewLast'
      };

      // Act
      const result = await authManager.updateProfile(params);

      // Assert
      expect(result.user.lastName).toBe('NewLast');
      expect(result.user.firstName).toBe('John'); // Should not change
    });

    it('should update both firstName and lastName', async () => {
      // Arrange
      const user = await createTestUser();

      const params = {
        __token: { userId: user._id.toString() },
        firstName: 'NewFirst',
        lastName: 'NewLast'
      };

      // Act
      const result = await authManager.updateProfile(params);

      // Assert
      expect(result.user.firstName).toBe('NewFirst');
      expect(result.user.lastName).toBe('NewLast');
    });
  });

  // ==========================================
  // CHANGE PASSWORD TESTS
  // ==========================================

  describe('changePassword()', () => {
    it('should change password successfully', async () => {
      // Arrange
      const user = await createTestUser({
        password: 'OldPassword123!'
      });

      const params = {
        __token: { userId: user._id.toString() },
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!'
      };

      // Act
      const result = await authManager.changePassword(params);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('successfully');

      // Verify password was changed in database
      const updatedUser = await User.findById(user._id).select('+password');
      const isNewPasswordValid = await updatedUser.comparePassword('NewPassword123!');
      expect(isNewPasswordValid).toBe(true);
    });

    it('should return error if current password is incorrect', async () => {
      // Arrange
      const user = await createTestUser({
        password: 'CorrectPassword123!'
      });

      const params = {
        __token: { userId: user._id.toString() },
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!'
      };

      // Act
      const result = await authManager.changePassword(params);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'INVALID_PASSWORD');
    });

    it('should hash new password', async () => {
      // Arrange
      const user = await createTestUser({
        password: 'OldPassword123!'
      });

      const params = {
        __token: { userId: user._id.toString() },
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!'
      };

      // Act
      await authManager.changePassword(params);

      // Assert - Verify password is hashed
      const updatedUser = await User.findById(user._id).select('+password');
      expect(updatedUser.password).not.toBe('NewPassword123!');
      expect(updatedUser.password).toMatch(/^\$2[aby]\$/);
    });
  });
});
