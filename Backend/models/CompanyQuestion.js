const mongoose = require('mongoose');

const companyQuestionSchema = new mongoose.Schema({
  company: { type: String, required: true, index: true }, // e.g. 'TCS', 'Infosys', 'Wipro', 'Google', 'Capgemini', 'Amazon'
  section: { type: String, enum: ['Aptitude', 'Reasoning', 'Verbal', 'Coding', 'Technical', 'HR'], required: true },
  question: { type: String, required: true },
  options: [String], // present for MCQ sections
  correctIndex: Number, // present for MCQ sections
  explanation: String,
  // for Coding-type entries
  title: String,
  description: String,
  constraints: String,
  starterCode: String,
  testCases: [{ input: String, expectedOutput: String, hidden: Boolean }],
  source: { type: String, default: 'curated' }, // 'curated' = verified real question, 'ai' = AI-generated in company style
  verified: { type: Boolean, default: true },
  yearAsked: Number // optional, e.g. 2024, 2025
}, { timestamps: true });

companyQuestionSchema.index({ company: 1, section: 1 });

module.exports = mongoose.model('CompanyQuestion', companyQuestionSchema);