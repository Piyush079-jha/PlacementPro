const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  college: { type: String, trim: true },
  branch: { type: String, trim: true },
  graduationYear: { type: Number },
  targetRole: { type: String, trim: true },
  skills: [{ type: String }],
  resumeText: { type: String },
  resumeScore: { type: Number, default: 0 },
  avatar: { type: String },
  stats: {
    resumeAnalyzed: { type: Boolean, default: false },
    interviewSessions: { type: Number, default: 0 },
    jobsApplied: { type: Number, default: 0 },
    averageInterviewScore: { type: Number, default: 0 },
    totalInterviewScore: { type: Number, default: 0 },
    scansDetected: { type: Number, default: 0 }
  },
  skillGaps: [{ skill: String, priority: String }],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
