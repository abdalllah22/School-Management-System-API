/**
 * Cortex - TRUE AXION PATTERN
 * 
 * The cortex is the execution layer that:
 * 1. Handles all HTTP concerns
 * 2. Executes manager class methods
 * 3. Manages authentication & authorization
 * 4. Unifies parameter passing
 * 5. Handles responses consistently
 * 
 * Managers remain pure business logic classes
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

class Cortex {
  constructor() {
    this.config = config;
  }

  /**
   * Generate JWT access token
   */
  generateToken(payload) {
    return jwt.sign(payload, this.config.jwt.secret, {
      expiresIn: this.config.jwt.expiresIn
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, this.config.jwt.refreshSecret, {
      expiresIn: this.config.jwt.refreshExpiresIn
    });
  }

  /**
   * Verify token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.config.jwt.secret);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Authentication middleware - AXION PATTERN
   * Extracts token and attaches __token to request
   */
  authenticate() {
    return (req, res, next) => {
      try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
          return res.status(401).json({
            error: 'Access token required',
            code: 'NO_TOKEN'
          });
        }

        const decoded = this.verifyToken(token);
        
        // AXION PATTERN: Attach with __ prefix
        req.__token = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          schoolId: decoded.schoolId
        };

        next();
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: 'Token has expired',
            code: 'TOKEN_EXPIRED'
          });
        }
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
          });
        }
        return res.status(401).json({
          error: 'Authentication failed',
          code: 'AUTH_FAILED'
        });
      }
    };
  }

  /**
   * Authorization middleware - Check roles
   */
  authorize(...allowedRoles) {
    return (req, res, next) => {
      if (!req.__token) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NO_AUTH'
        });
      }

      if (!allowedRoles.includes(req.__token.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'FORBIDDEN'
        });
      }

      next();
    };
  }

  /**
   * CORE AXION PATTERN: Execute Manager Method
   * 
   * This is the heart of Axion architecture:
   * - Instantiates manager class per request
   * - Prepares unified params object with __ metadata
   * - Executes manager method
   * - Handles response/errors consistently
   */
  executeManager(ManagerClass, methodName) {
    return async (req, res) => {
      try {
        // Instantiate manager (fresh instance per request)
        const manager = new ManagerClass();

        // AXION PATTERN: Prepare unified params object
        const params = {
          // Merge all request data
          ...req.body,
          ...req.query,
          ...req.params,
          
          // AXION PATTERN: Metadata with __ prefix
          __token: req.__token,           // From authenticate middleware
          __headers: req.headers,          // All HTTP headers
          __device: req.headers['user-agent'] || 'unknown',
          __ip: req.ip || req.connection.remoteAddress,
          __method: req.method,
          __path: req.path,
          __timestamp: new Date().toISOString()
        };

        // Execute manager method
        const result = await manager[methodName](params);

        // Handle errors returned by manager
        if (result && result.error) {
          const statusCode = this.getStatusCode(result.code);
          return res.status(statusCode).json(result);
        }

        // Success response
        return res.status(200).json({
          success: true,
          ...result
        });

      } catch (error) {
        console.error(`❌ Manager execution error [${ManagerClass.name}.${methodName}]:`, error);
        
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
          return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: Object.values(error.errors).map(e => ({
              field: e.path,
              message: e.message
            }))
          });
        }

        // Handle Mongoose duplicate key errors
        if (error.code === 11000) {
          const field = Object.keys(error.keyPattern)[0];
          return res.status(409).json({
            error: `Duplicate ${field}`,
            code: 'DUPLICATE_ERROR'
          });
        }

        // Handle Mongoose CastError (invalid ObjectId)
        if (error.name === 'CastError') {
          return res.status(400).json({
            error: 'Invalid ID format',
            code: 'INVALID_ID'
          });
        }

        // Generic server error
        return res.status(500).json({
          error: 'Internal server error',
          code: 'SERVER_ERROR',
          ...(process.env.NODE_ENV === 'development' && { 
            message: error.message,
            stack: error.stack 
          })
        });
      }
    };
  }

  /**
   * Validation middleware using Joi
   */
  validate(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        return res.status(400).json({
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: errors
        });
      }

      // Replace body with validated value
      req.body = value;
      next();
    };
  }

  /**
   * Map error codes to HTTP status codes
   */
  getStatusCode(code) {
    const statusMap = {
      // 400 Bad Request
      'VALIDATION_ERROR': 400,
      'INVALID_INPUT': 400,
      'INVALID_ID': 400,
      
      // 401 Unauthorized
      'NO_TOKEN': 401,
      'INVALID_TOKEN': 401,
      'TOKEN_EXPIRED': 401,
      'INVALID_CREDENTIALS': 401,
      'AUTH_FAILED': 401,
      
      // 403 Forbidden
      'FORBIDDEN': 403,
      'ACCESS_DENIED': 403,
      'NO_PERMISSION': 403,
      
      // 404 Not Found
      'NOT_FOUND': 404,
      'USER_NOT_FOUND': 404,
      'SCHOOL_NOT_FOUND': 404,
      
      // 409 Conflict
      'DUPLICATE': 409,
      'DUPLICATE_ERROR': 409,
      'USER_EXISTS': 409,
      'CONFLICT': 409,
      
      // 422 Unprocessable Entity
      'BUSINESS_ERROR': 422,
      'CAPACITY_FULL': 422,
      'INVALID_OPERATION': 422
    };

    return statusMap[code] || 400;
  }

  /**
   * Helper: Extract schoolId from various sources
   * Used for school admin access control
   */
  extractSchoolId(params) {
    return params.schoolId || params.school || params.__token?.schoolId;
  }

  /**
   * Helper: Check if user is superadmin
   */
  isSuperadmin(token) {
    return token && token.role === 'superadmin';
  }

  /**
   * Helper: Check if user is school admin
   */
  isSchoolAdmin(token) {
    return token && token.role === 'school_admin';
  }

  /**
   * Helper: Verify school admin can access resource
   */
  canAccessSchool(token, schoolId) {
    if (this.isSuperadmin(token)) return true;
    if (!this.isSchoolAdmin(token)) return false;
    return token.schoolId && token.schoolId.toString() === schoolId.toString();
  }
}

// Export singleton instance
module.exports = new Cortex();
