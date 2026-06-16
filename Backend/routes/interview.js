const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { callClaude, parseJSON } = require('../config/ai');
const Interview = require('../models/Interview');
const User = require('../models/User');

// Generate interview questions
router.post('/questions', auth, async (req, res) => {
  try {
    const { role, difficulty, count = 5, type = 'mixed' } = req.body;
    if (!role) return res.status(400).json({ error: 'Role is required' });

    const systemPrompt = `You are a senior technical interviewer at top Indian tech companies. 
Generate realistic interview questions. Respond with valid JSON only.`;

    const userMessage = `Generate ${count} ${difficulty || 'Medium'} difficulty ${type} interview questions for a ${role} position.
Return JSON array:
[
  {
    "id": "q1",
    "question": "question text",
    "type": "Technical|Behavioral|HR|DSA",
    "hints": ["hint1"],
    "expectedKeywords": ["keyword1"]
  }
]`;

    const result = await callClaude(systemPrompt, userMessage, 1000);
    const questions = parseJSON(result);
    if (!questions) return res.status(500).json({ error: 'Failed to generate questions' });

    res.json({ success: true, questions, role, difficulty });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Evaluate a single answer
router.post('/evaluate', auth, async (req, res) => {
  try {
    const { question, answer, role, type } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'Question and answer required' });
    if (answer.trim().length < 10) return res.status(400).json({ error: 'Answer too short. Please elaborate.' });

    const systemPrompt = `You are a strict but fair technical interviewer. Evaluate answers honestly. Respond with valid JSON only.`;

    const userMessage = `Evaluate this ${type || 'technical'} interview answer for a ${role || 'developer'} role.

Question: ${question}
Answer: ${answer.substring(0, 1000)}

Return JSON:
{
  "score": <0-10>,
  "feedback": "detailed feedback",
  "idealAnswer": "what a great answer would include",
  "strengths": ["strength1"],
  "improvements": ["improvement1"],
  "keywords": ["keyword you mentioned correctly"]
}`;

    const result = await callClaude(systemPrompt, userMessage, 800);
    const evaluation = parseJSON(result);
    if (!evaluation) return res.status(500).json({ error: 'Evaluation failed' });

    res.json({ success: true, evaluation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save completed interview session
router.post('/save', auth, async (req, res) => {
  try {
    const { role, difficulty, questions, overallFeedback, duration } = req.body;

    const scores = questions.filter(q => q.score != null).map(q => q.score);
    const overallScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) : 0;

    const interview = new Interview({
      user: req.userId,
      role, difficulty, questions,
      overallScore, overallFeedback, duration
    });
    await interview.save();

    // Update user stats
    const user = await User.findById(req.userId);
    const newTotal = (user.stats.totalInterviewScore || 0) + overallScore;
    const newCount = (user.stats.interviewSessions || 0) + 1;
    await User.findByIdAndUpdate(req.userId, {
      $inc: { 'stats.interviewSessions': 1 },
      'stats.totalInterviewScore': newTotal,
      'stats.averageInterviewScore': Math.round(newTotal / newCount)
    });

    res.json({ success: true, interview, overallScore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get interview history
router.get('/history', auth, async (req, res) => {
  try {
    const interviews = await Interview.find({ user: req.userId })
      .sort({ completedAt: -1 })
      .limit(20)
      .select('role difficulty overallScore duration completedAt questions');
    res.json({ interviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
