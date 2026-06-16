const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, required: true },
  college: { type: String },
  company: { type: String, required: true },
  role: { type: String, required: true },
  type: { type: String, enum: ['On-Campus', 'Off-Campus', 'Referral', 'Walk-in'], default: 'On-Campus' },
  year: { type: Number, required: true },
  package: { type: String },
  rounds: [{
    name: String,
    description: String,
    difficulty: String
  }],
  tips: { type: String },
  verdict: { type: String, enum: ['Selected', 'Rejected', 'On Hold'], default: 'Selected' },
  upvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isAnonymous: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Experience', experienceSchema);
