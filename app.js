const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');

const app = express();

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true
}));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB injection prevention
app.use(mongoSanitize());

// Rate limiting
const rateLimiter = require('./mws/rateLimiter');
app.use('/api', rateLimiter);

// ============================================
// ROUTES - AXION STYLE
// ============================================

const authRoutes = require('./managers/auth/auth.routes');
const schoolRoutes = require('./managers/school/school.routes');
const classroomRoutes = require('./managers/classroom/classroom.routes');
const studentRoutes = require('./managers/student/student.routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/schools', schoolRoutes);
app.use('/api/v1/classrooms', classroomRoutes);
app.use('/api/v1/students', studentRoutes);


// ============================================
// HEALTH & INFO ENDPOINTS
// ============================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});



// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: `Route ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.statusCode || 500).json({
    error: error.message || 'Internal server error',
    code: error.code || 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

module.exports = app;
