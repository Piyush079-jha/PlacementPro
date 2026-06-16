const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Interview = require('../models/Interview');

router.get('/', auth, async (req, res) => {
  try {
    const [user, recentInterviews] = await Promise.all([
      User.findById(req.userId),
      Interview.find({ user: req.userId }).sort({ completedAt: -1 }).limit(5).select('role overallScore completedAt difficulty')
    ]);

    const progressData = recentInterviews.map(i => ({
      role: i.role,
      score: i.overallScore,
      date: i.completedAt,
      difficulty: i.difficulty
    }));

    const readiness = calculateReadiness(user);

    res.json({
      user,
      stats: user.stats,
      recentInterviews: progressData,
      readinessScore: readiness,
      skillGaps: user.skillGaps || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function calculateReadiness(user) {
  let score = 0;
  if (user.stats.resumeAnalyzed) score += 25;
  if (user.stats.interviewSessions >= 1) score += 20;
  if (user.stats.interviewSessions >= 5) score += 15;
  if (user.resumeScore > 70) score += 20;
  if (user.stats.averageInterviewScore > 70) score += 20;
  return Math.min(score, 100);
}

module.exports = router;
