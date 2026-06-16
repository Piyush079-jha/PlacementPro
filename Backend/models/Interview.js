const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  questions: [{
    question: String,
    userAnswer: String,
    feedback: String,
    score: { type: Number, min: 0, max: 10 },
    idealAnswer: String
  }],
  overallScore: { type: Number, default: 0 },
  overallFeedback: { type: String },
  strengths: [String],
  improvements: [String],
  duration: { type: Number },
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Interview', interviewSchema);
