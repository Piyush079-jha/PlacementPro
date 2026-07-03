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
Generate realistic, VARIED interview questions — avoid generic, overused, or repetitive questions like "tell me about yourself" or basic textbook definitions unless explicitly asked.
Each time you are called, generate a fresh, different set of questions even for the same role — vary the angle, sub-topic, and phrasing. Respond with valid JSON only.`;

    const seedTopics = ['system design', 'real-world debugging', 'edge cases', 'trade-offs', 'past project scenarios', 'optimization', 'collaboration', 'recent industry practices', 'architecture decisions', 'failure handling'];
    const randomAngle = seedTopics[Math.floor(Math.random() * seedTopics.length)];

    const userMessage = `Generate ${count} ${difficulty || 'Medium'} difficulty ${type} interview questions for a ${role} position.
Lean toward the angle of "${randomAngle}" where relevant, and ensure variety — do not reuse common generic questions.
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
    const { role, difficulty, type, history = [], turnNumber, totalQuestions, candidateName } = req.body;
    if (!role) return res.status(400).json({ error: 'Role is required' });
    if (!totalQuestions) return res.status(400).json({ error: 'totalQuestions is required' });

    const displayName = (candidateName && candidateName.trim()) ? candidateName.trim() : null;

    const isFirstTurn = turnNumber === 0 || history.length === 0;
    const isFinalTurn = turnNumber >= totalQuestions - 1;

    const systemPrompt = `You are a senior, professional interviewer conducting a live video interview at a top Indian tech company.
You speak naturally, one question at a time, and briefly acknowledge the candidate's previous answer before moving on — like a real human interviewer reacting in the moment, not reading a script.
Adapt your next question based on the DEPTH and QUALITY of the candidate's last answer:
- If their answer was shallow or vague, ask a probing follow-up on the SAME topic to test real understanding.
- If their answer was strong, move to a new topic or increase difficulty.
- If they mentioned a specific technology, project, or claim, dig into it with a targeted follow-up.
While generating each turn, silently assess (for internal scoring) the candidate's communication clarity, technical depth, problem-solving approach, and confidence — this will be used for final feedback, but do not say scores aloud during the interview.
Keep your spoken text concise (2-4 sentences max) since it will be read aloud by text-to-speech.
Always generate fresh, varied questions — avoid generic or repeated questions across sessions, and avoid overlapping topics within the same interview.
If you're given the candidate's name, use it ONLY in the opening greeting — real interviewers don't repeat a candidate's name before every sentence, it feels scripted. Do not use the name again in later turns unless naturally re-engaging attention (e.g. candidate seemed to stall).
Vary HOW you acknowledge answers turn to turn — don't open every response the same way (e.g. don't always start with "Great answer" or "Good job"). Sometimes acknowledge briefly and move on, sometimes ask a genuine follow-up on something specific they said, sometimes just transition naturally without an explicit compliment — mirror how a real interviewer's reactions differ based on what was actually said.
Respond with valid JSON only.`;

    const historyText = history.map((h, i) =>
      `Q${i + 1}: ${h.question}\nCandidate's answer: ${h.answer}`
    ).join('\n\n');

    const userMessage = isFirstTurn
      ? `Start a live ${difficulty || 'Medium'} difficulty ${type || 'mixed'} interview for a ${role} position.
${displayName ? `Greet the candidate by name: start with "Hi ${displayName}," exactly, then continue warmly. Use their name ONCE only, in this greeting.` : `Greet the candidate warmly using "Hi there," — do not use any other name.`}
This is the opening of the interview — ease the candidate in like a real interviewer would. Then ask a light, easy opening question (e.g. "tell me about yourself", a quick icebreaker about their background/experience, or a simple intro-level question). Do NOT start with a hard technical or DSA question — save depth for later turns once the candidate is warmed up.

Return JSON:
{
  "spokenText": "brief warm greeting + the easy opening question, written to be spoken aloud naturally",
  "question": "the question text alone",
  "questionType": "Behavioral|HR"
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

    // Safety net: if a name was expected but the model produced a different one
    // (or invented one when none was given), correct it rather than trust the model blindly.
    if (isFirstTurn && turn.spokenText) {
      const commonFakeNames = ['Rohan', 'Priya', 'Amit', 'Rahul', 'Sneha', 'Anjali', 'Vikram'];
      if (displayName) {
        for (const fake of commonFakeNames) {
          if (fake !== displayName && turn.spokenText.includes(fake)) {
            turn.spokenText = turn.spokenText.replace(new RegExp(fake, 'g'), displayName);
          }
        }
      } else {
        for (const fake of commonFakeNames) {
          turn.spokenText = turn.spokenText.replace(new RegExp(`\\b${fake}\\b,?\\s*`, 'g'), '');
        }
      }
    }

    res.json({ success: true, turn });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate comprehensive final feedback for a completed video interview
router.post('/video-summary', auth, async (req, res) => {
  try {
    const { role, difficulty, history = [], candidateName } = req.body;
    if (!history.length) return res.status(400).json({ error: 'No interview history provided' });

    const displayName = (candidateName && candidateName.trim()) ? candidateName.trim() : null;

    const systemPrompt = `You are a senior technical interviewer providing a final, honest performance review after a live interview.
Be specific, constructive, and actionable — like real interview feedback a candidate would get from a hiring manager. Respond with valid JSON only.`;

    const transcript = history.map((h, i) => `Q${i + 1}: ${h.question}\nAnswer: ${h.answer}`).join('\n\n');

    const userMessage = `Review this full interview transcript for ${displayName ? `${displayName}, a candidate` : 'a candidate'} applying for a ${role} position (${difficulty || 'Medium'} difficulty):

${transcript}

Evaluate the candidate across these dimensions and return JSON:
{
  "overallScore": <0-100>,
  "communicationScore": <0-10>,
  "technicalScore": <0-10>,
  "problemSolvingScore": <0-10>,
  "confidenceScore": <0-10>,
  "strengths": ["specific strength 1", "specific strength 2"],
  "weaknesses": ["specific weakness 1", "specific weakness 2"],
  "actionableTips": ["concrete tip 1", "concrete tip 2", "concrete tip 3"],
  "summary": "2-3 sentence honest overall assessment, like a hiring manager would write"
}`;

    const result = await callClaude(systemPrompt, userMessage, 900);
    const feedback = parseJSON(result);
    if (!feedback) return res.status(500).json({ error: 'Failed to generate feedback' });

    res.json({ success: true, feedback });
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