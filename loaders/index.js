// User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^\S+@\S+\.\S+$/ },
  password: { type: String, required: true, minlength: 8, select: false },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  role: { type: String, enum: ['superadmin', 'school_admin'], required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: function() { return this.role === 'school_admin'; } },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(config.bcrypt.rounds);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(pwd) {
  return await bcrypt.compare(pwd, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

userSchema.index({ email: 1 });
userSchema.index({ role: 1, schoolId: 1 });

// School.js Model
const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  contactInfo: {
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    website: String
  },
  establishedYear: { type: Number, min: 1800, max: new Date().getFullYear() },
  principalName: String,
  totalCapacity: { type: Number, min: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

schoolSchema.index({ name: 1 });
schoolSchema.index({ isActive: 1 });

// Classroom.js Model
const classroomSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  name: { type: String, required: true, trim: true },
  grade: { type: Number, required: true, min: 1, max: 12 },
  section: { type: String, trim: true, uppercase: true },
  capacity: { type: Number, required: true, min: 1 },
  currentEnrollment: { type: Number, default: 0, min: 0 },
  roomNumber: String,
  teacher: {
    name: String,
    email: String,
    phone: String
  },
  subjects: [String],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

classroomSchema.index({ schoolId: 1, isActive: 1 });
classroomSchema.index({ schoolId: 1, grade: 1, section: 1 });

classroomSchema.pre('save', function(next) {
  if (this.currentEnrollment > this.capacity) {
    return next(new Error('Current enrollment cannot exceed capacity'));
  }
  next();
});

// Student.js Model
const studentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  classroomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  studentId: { type: String, unique: true, required: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  contactInfo: {
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  guardian: {
    name: { type: String, required: true },
    relationship: String,
    email: String,
    phone: { type: String, required: true }
  },
  enrollmentDate: { type: Date, required: true, default: Date.now },
  transferHistory: [{
    fromSchool: String,
    date: Date,
    reason: String
  }],
  status: { type: String, enum: ['active', 'transferred', 'graduated', 'withdrawn'], default: 'active' },
  academicInfo: {
    previousSchool: String,
    gradeLevel: { type: Number, min: 1, max: 12 }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

studentSchema.index({ studentId: 1 }, { unique: true });
studentSchema.index({ schoolId: 1, status: 1 });
studentSchema.index({ classroomId: 1, status: 1 });



// Export all models
module.exports = {
  User: mongoose.model('User', userSchema),
  School: mongoose.model('School', schoolSchema),
  Classroom: mongoose.model('Classroom', classroomSchema),
  Student: mongoose.model('Student', studentSchema)
};
