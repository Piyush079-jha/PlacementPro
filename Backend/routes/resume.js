const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { callClaude, parseJSON } = require('../config/ai');
const User = require('../models/User');

const pdfParse = require('pdf-parse');
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('text/')) cb(null, true);
  else cb(new Error('Only PDF and text files allowed'));
}});

router.post('/parse-pdf', auth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const data = await pdfParse(req.file.buffer);
    if (!data.text || data.text.trim().length < 50)
      return res.status(400).json({ error: 'Could not extract text from PDF. Try copying text manually.' });
    res.json({ success: true, text: data.text });
  } catch (err) {
    res.status(500).json({ error: 'PDF parsing failed. Please paste your resume text instead.' });
  }
});

// Analyze resume text
router.post('/analyze', auth, async (req, res) => {
  try {
    const { resumeText, targetRole } = req.body;
    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ error: 'Please provide a valid resume text (minimum 50 characters)' });
    }

    const systemPrompt = `You are an expert resume reviewer and career coach specializing in Indian tech placements. 
Analyze resumes and provide actionable, specific feedback. Always respond with valid JSON only.`;

    const userMessage = `Analyze this resume for a ${targetRole || 'software developer'} role and return a JSON object with this exact structure:
{
  "score": <number 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": [
    {
      "section": "<section name>",
      "issue": "<specific issue>",
      "suggestion": "<actionable suggestion>"
    }
  ],
  "missingKeywords": ["<keyword1>", "<keyword2>"],
  "skillsDetected": ["<skill1>", "<skill2>"],
  "atsScore": <number 0-100>,
  "formatScore": <number 0-100>,
  "contentScore": <number 0-100>,
  "skillGaps": [{"skill": "<skill>", "priority": "High|Medium|Low"}],
  "quickWins": ["<actionable quick fix 1>", "<actionable quick fix 2>", "<actionable quick fix 3>"]
}

Resume:
${resumeText.substring(0, 3000)}`;

    const result = await callClaude(systemPrompt, userMessage, 1500);
    const analysis = parseJSON(result);

    if (!analysis) return res.status(500).json({ error: 'Failed to parse AI analysis. Please try again.' });

    // Update user stats
    await User.findByIdAndUpdate(req.userId, {
      'stats.resumeAnalyzed': true,
      resumeScore: analysis.score || 0,
      resumeText: resumeText.substring(0, 5000),
      skills: analysis.skillsDetected || [],
      skillGaps: analysis.skillGaps || []
    });

    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// Skill gap analysis
router.post('/skill-gap', auth, async (req, res) => {
  try {
    const { resumeText, targetRole, targetCompany } = req.body;
    if (!resumeText || !targetRole) return res.status(400).json({ error: 'Resume text and target role required' });

    const systemPrompt = `You are a technical skills assessor. Provide detailed skill gap analysis. Respond with valid JSON only.`;

    const userMessage = `Based on this resume, provide a skill gap analysis for a ${targetRole} role${targetCompany ? ` at ${targetCompany}` : ''}.
Return JSON:
{
  "currentSkills": ["skill1"],
  "requiredSkills": ["skill1"],
  "missingSkills": [{"skill": "name", "priority": "High", "learningPath": "how to learn", "timeToLearn": "2 weeks"}],
  "readinessScore": 75,
  "recommendation": "overall recommendation"
}

Resume: ${resumeText.substring(0, 2000)}`;

    const result = await callClaude(systemPrompt, userMessage, 1000);
    const analysis = parseJSON(result);
    if (!analysis) return res.status(500).json({ error: 'Analysis failed. Try again.' });
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
