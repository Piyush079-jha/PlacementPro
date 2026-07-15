const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Experience = require('../models/Experience');

// Get all experiences
router.get('/', async (req, res) => {
  try {
    const { company, role, page = 1, limit = 10 } = req.query;
    const query = {};
    if (company) query.company = new RegExp(company, 'i');
    if (role) query.role = new RegExp(role, 'i');

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [experiences, total] = await Promise.all([
      Experience.find(query).sort({ upvotes: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Experience.countDocuments(query)
    ]);
    res.json({ experiences, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post an experience
router.post('/', auth, async (req, res) => {
  try {
    const { company, role, type, year, package: pkg, rounds, tips, verdict, isAnonymous } = req.body;
    if (!company || !role || !year) return res.status(400).json({ error: 'Company, role, and year required' });

    const user = await require('../models/User').findById(req.userId);
    const experience = new Experience({
      user: req.userId,
      authorName: isAnonymous ? 'Anonymous' : user.name,
      college: user.college,
      company, role, type, year,
      package: pkg, rounds, tips, verdict, isAnonymous
    });
    await experience.save();
    res.status(201).json({ success: true, experience });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upvote experience
router.patch('/:id/upvote', auth, async (req, res) => {
  try {
    const experience = await Experience.findById(req.params.id);
    if (!experience) return res.status(404).json({ error: 'Experience not found' });

    const alreadyUpvoted = experience.upvotedBy.includes(req.userId);
    if (alreadyUpvoted) {
      experience.upvotes--;
      experience.upvotedBy = experience.upvotedBy.filter(id => id.toString() !== req.userId);
    } else {
      experience.upvotes++;
      experience.upvotedBy.push(req.userId);
    }
    await experience.save();
    res.json({ upvotes: experience.upvotes, upvoted: !alreadyUpvoted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed sample experiences
router.post('/seed', async (req, res) => {
  try {
    await Experience.deleteMany({});
    const samples = [
      { authorName: 'Rahul Sharma', college: 'BITS Pilani', company: 'Amazon', role: 'SDE-1', type: 'Off-Campus', year: 2024, package: '22 LPA', verdict: 'Selected', rounds: [{ name: 'OA', description: '2 DSA problems - medium difficulty. Covered arrays and graphs.', difficulty: 'Medium' }, { name: 'Technical Round 1', description: 'Asked about OS concepts, system design of URL shortener, 2 coding problems.', difficulty: 'Hard' }, { name: 'Bar Raiser', description: 'Leadership principles + one hard DP problem.', difficulty: 'Hard' }], tips: 'Focus on LP stories using STAR method. Practice 200+ Leetcode problems. Amazon loves BFS/DFS.', upvotes: 89 },
      { authorName: 'Priya Patel', college: 'NIT Trichy', company: 'Flipkart', role: 'SDE-1', type: 'On-Campus', year: 2024, package: '18 LPA', verdict: 'Selected', rounds: [{ name: 'Coding Test', description: '3 problems in 90 minutes. Two medium, one hard.', difficulty: 'Medium' }, { name: 'Technical Interview', description: 'Focused on arrays, DP, and basic system design.', difficulty: 'Medium' }], tips: 'For on-campus, CGPA matters. Keep it above 7.5. Practice company-specific problems on GFG.', upvotes: 67 },
      { authorName: 'Anonymous', college: 'VIT Vellore', company: 'TCS Digital', role: 'Software Developer', type: 'On-Campus', year: 2024, package: '7 LPA', verdict: 'Selected', rounds: [{ name: 'Written Test', description: 'Aptitude, verbal, coding (2 easy problems)', difficulty: 'Easy' }, { name: 'Technical + HR', description: 'Projects, OOPS concepts, basic SQL queries.', difficulty: 'Easy' }], tips: 'TCS Digital is much better than TCS Ninja. Prepare OOPS thoroughly. Know your projects well.', upvotes: 45, isAnonymous: true }
    ];
    await Experience.insertMany(samples);
    res.json({ message: 'Experiences seeded', count: samples.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an experience (owner only)
router.put('/:id', auth, async (req, res) => {
  try {
    const experience = await Experience.findById(req.params.id);
    if (!experience) return res.status(404).json({ error: 'Experience not found' });
    if (experience.user?.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this experience' });
    }

    const { company, role, type, year, package: pkg, rounds, tips, verdict, isAnonymous } = req.body;
    if (company !== undefined) experience.company = company;
    if (role !== undefined) experience.role = role;
    if (type !== undefined) experience.type = type;
    if (year !== undefined) experience.year = year;
    if (pkg !== undefined) experience.package = pkg;
    if (rounds !== undefined) experience.rounds = rounds;
    if (tips !== undefined) experience.tips = tips;
    if (verdict !== undefined) experience.verdict = verdict;
    if (isAnonymous !== undefined) experience.isAnonymous = isAnonymous;

    await experience.save();
    res.json({ success: true, experience });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an experience (owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const experience = await Experience.findById(req.params.id);
    if (!experience) return res.status(404).json({ error: 'Experience not found' });
    if (experience.user?.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this experience' });
    }
    await experience.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
