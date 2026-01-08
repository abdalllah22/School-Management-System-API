/**
 * Auth Routes 
 * Uses cortex.executeManager() to execute Auth manager methods
 */

const express = require('express');
const router = express.Router();
const cortex = require('../../libs/cortex');
const AuthManager = require('./Auth.manager');
const { authLimiter } = require('../../mws/rateLimiter');
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema
} = require('./auth.validators');

// Public routes (with auth rate limiting)
router.post('/register',
  authLimiter,
  cortex.validate(registerSchema),
  cortex.executeManager(AuthManager, 'register')
);

router.post('/login',
  authLimiter,
  cortex.validate(loginSchema),
  cortex.executeManager(AuthManager, 'login')
);

// Protected routes (require authentication)
router.get('/me',
  cortex.authenticate(),
  cortex.executeManager(AuthManager, 'getMe')
);

router.put('/me',
  cortex.authenticate(),
  cortex.validate(updateProfileSchema),
  cortex.executeManager(AuthManager, 'updateProfile')
);

router.put('/change-password',
  cortex.authenticate(),
  cortex.validate(changePasswordSchema),
  cortex.executeManager(AuthManager, 'changePassword')
);

module.exports = router;
