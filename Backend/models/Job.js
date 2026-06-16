const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  location: { type: String, trim: true },
  type: { type: String, enum: ['Full-time', 'Internship', 'Part-time', 'Remote'], default: 'Full-time' },
  salary: { type: String },
  experience: { type: String, default: 'Fresher' },
  description: { type: String },
  requirements: [String],
  skills: [String],
  applyLink: { type: String },
  source: { type: String },
  postedAt: { type: Date, default: Date.now },
  deadline: { type: Date },
  isVerified: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  applicants: { type: Number, default: 0 },
  logo: { type: String }
}, { timestamps: true });

jobSchema.index({ title: 'text', company: 'text', skills: 'text' });

module.exports = mongoose.model('Job', jobSchema);
