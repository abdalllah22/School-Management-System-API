require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./connect/mongo');

const PORT = process.env.PORT || 3000;

// Bootstrap application
const bootstrap = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎓 School Management System API                          ║
║   🚀 Server running on port ${PORT}                        ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'} ║
║                                                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to bootstrap application:', error);
    process.exit(1);
  }
};

// Error handlers
process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION:', err.name, err.message);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

// Start application
bootstrap();


