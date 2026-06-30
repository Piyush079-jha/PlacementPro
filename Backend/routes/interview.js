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

// Generate the next question/feedback turn in a live video interview.
// Unlike /questions (batch upfront), this reacts turn-by-turn to the conversation so far,
// which is what makes the video mode feel like a real, responsive interviewer.
router.post('/video-turn', auth, async (req, res) => {
  try {
    const { role, difficulty, type, history = [], turnNumber, totalQuestions } = req.body;
    if (!role) return res.status(400).json({ error: 'Role is required' });
    if (!totalQuestions) return res.status(400).json({ error: 'totalQuestions is required' });

    const isFirstTurn = turnNumber === 0 || history.length === 0;
    const isFinalTurn = turnNumber >= totalQuestions - 1;

    const systemPrompt = `You are a senior, professional interviewer conducting a live video interview at a top Indian tech company.
You speak naturally, one question at a time, and briefly acknowledge the candidate's previous answer before moving on.
Keep your spoken text concise (2-4 sentences max) since it will be read aloud by text-to-speech.
Respond with valid JSON only.`;

    const historyText = history.map((h, i) =>
      `Q${i + 1}: ${h.question}\nCandidate's answer: ${h.answer}`
    ).join('\n\n');

    const userMessage = isFirstTurn
      ? `Start a live ${difficulty || 'Medium'} difficulty ${type || 'mixed'} interview for a ${role} position. Greet the candidate briefly and professionally, then ask your first question.

Return JSON:
{
  "spokenText": "brief greeting + the question, written to be spoken aloud naturally",
  "question": "the question text alone",
  "questionType": "Technical|Behavioral|HR|DSA"
}`
      : `Interview so far for a ${role} position (${difficulty || 'Medium'} difficulty):

${historyText}

${isFinalTurn
  ? `This is the final question. First, give brief spoken feedback (1-2 sentences) on the candidate's last answer, score it, then ask one last strong question.`
  : `Give brief spoken feedback (1-2 sentences) on the candidate's last answer, score it, then ask the next question. Vary the question type naturally and avoid repeating earlier topics.`}

Return JSON:
{
  "spokenText": "brief acknowledgment/feedback on the previous answer, spoken naturally, then the next question",
  "previousAnswerScore": <0-10>,
  "previousAnswerFeedback": "short feedback text",
  "question": "the next question text alone",
  "questionType": "Technical|Behavioral|HR|DSA",
  "isLastQuestion": ${isFinalTurn}
}`;

    const result = await callClaude(systemPrompt, userMessage, 600);
    const turn = parseJSON(result);
    if (!turn) return res.status(500).json({ error: 'Failed to generate next turn. Please try again.' });

    res.json({ success: true, turn });
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