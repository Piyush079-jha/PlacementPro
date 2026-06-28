const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { callClaude, parseJSON } = require('../config/ai');
const Job = require('../models/Job');
const User = require('../models/User');
const axios = require('axios');
const cheerio = require('cheerio');

// Get all jobs with filters
router.get('/', async (req, res) => {
  try {
    const { search, type, location, skills, page = 1, limit = 12 } = req.query;
    const query = { isVerified: true };

    if (search) query.$text = { $search: search };
    if (type && type !== 'All') query.type = type;
    if (location && location !== 'All') query.location = new RegExp(location, 'i');
    if (skills) query.skills = { $in: skills.split(',') };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [jobs, total] = await Promise.all([
      Job.find(query).sort({ isFeatured: -1, postedAt: -1 }).skip(skip).limit(parseInt(limit)),
      Job.countDocuments(query)
    ]);

    res.json({ jobs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed sample jobs (dev helper)
router.post('/seed', async (req, res) => {
  try {
    await Job.deleteMany({});
    const sampleJobs = [
      { title: 'Software Engineer - Fresher', company: 'TCS', location: 'Bangalore', type: 'Full-time', salary: '3.5 - 4.5 LPA', skills: ['Java', 'SQL', 'Problem Solving'], description: 'Join our flagship program for fresh graduates...', isVerified: true, isFeatured: true, applyLink: 'https://www.tcs.com/careers', source: 'TCS Careers' },
      { title: 'React Developer Intern', company: 'Razorpay', location: 'Bangalore (Remote)', type: 'Internship', salary: '25,000 - 35,000/month', skills: ['React', 'JavaScript', 'REST APIs'], description: 'Work with our payments team on exciting features...', isVerified: true, isFeatured: true, applyLink: 'https://razorpay.com/jobs/', source: 'Razorpay Careers' },
      { title: 'Data Analyst Trainee', company: 'Infosys', location: 'Pune', type: 'Full-time', salary: '3.6 LPA', skills: ['Python', 'SQL', 'Excel', 'Tableau'], description: 'Analyze data and create dashboards for business insights...', isVerified: true, applyLink: 'https://career.infosys.com/', source: 'Infosys Careers' },
      { title: 'SDE-1', company: 'Amazon', location: 'Hyderabad', type: 'Full-time', salary: '18-22 LPA', skills: ['DSA', 'System Design', 'Java/Python'], description: 'Build scalable systems at Amazon...', isVerified: true, isFeatured: true, applyLink: 'https://www.amazon.jobs/en/teams/software-development', source: 'Amazon Jobs' },
      { title: 'Frontend Developer', company: 'Swiggy', location: 'Bangalore', type: 'Full-time', salary: '12-18 LPA', skills: ['React', 'TypeScript', 'CSS'], description: 'Build delightful user experiences for millions of users...', isVerified: true, applyLink: 'https://careers.swiggy.com/', source: 'Swiggy Careers' },
      { title: 'Backend Engineer Intern', company: 'Zepto', location: 'Mumbai (Hybrid)', type: 'Internship', salary: '30,000/month', skills: ['Node.js', 'MongoDB', 'Redis'], description: 'Work on our high-traffic backend systems...', isVerified: true, applyLink: 'https://www.zeptonow.com/careers', source: 'Zepto Jobs' },
      { title: 'ML Engineer - Entry Level', company: 'Flipkart', location: 'Bangalore', type: 'Full-time', salary: '15-20 LPA', skills: ['Python', 'TensorFlow', 'ML'], description: 'Build recommendation systems and ML models...', isVerified: true, applyLink: 'https://www.flipkartcareers.com/', source: 'Flipkart Careers' },
      { title: 'Full Stack Developer', company: 'CRED', location: 'Bangalore', type: 'Full-time', salary: '20-30 LPA', skills: ['React', 'Node.js', 'PostgreSQL'], description: 'Build premium fintech experiences...', isVerified: true, applyLink: 'https://careers.cred.club/', source: 'CRED Careers' },
      { title: 'DevOps Intern', company: 'Juspay', location: 'Bangalore', type: 'Internship', salary: '20,000/month', skills: ['Docker', 'Kubernetes', 'AWS'], description: 'Manage and optimize our cloud infrastructure...', isVerified: true, applyLink: 'https://juspay.in/careers', source: 'Juspay Jobs' },
      { title: 'Associate Software Engineer', company: 'Wipro', location: 'Multiple Cities', type: 'Full-time', salary: '3.5 LPA', skills: ['Java', 'SQL', 'Communication'], description: 'Part of WILP program for fresh graduates...', isVerified: true, applyLink: 'https://careers.wipro.com/', source: 'Wipro WILP' },
      { title: 'Android Developer', company: 'PhonePe', location: 'Bangalore', type: 'Full-time', salary: '15-22 LPA', skills: ['Kotlin', 'Android SDK', 'Jetpack'], description: 'Build features for 400M+ users...', isVerified: true, applyLink: 'https://www.phonepe.com/en/careers.html', source: 'PhonePe Careers' },
      { title: 'Data Science Intern', company: 'Ola', location: 'Bangalore', type: 'Internship', salary: '25,000/month', skills: ['Python', 'Pandas', 'Statistics'], description: 'Work on mobility data analysis...', isVerified: true, applyLink: 'https://ola.careers/', source: 'Ola Careers' }
    ];
    await Job.insertMany(sampleJobs);
    res.json({ message: 'Jobs seeded successfully', count: sampleJobs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scrape job text from a URL — targets job content blocks, not full page noise
async function scrapeJobFromUrl(url) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    timeout: 8000
  });

  const $ = cheerio.load(data);

  // Strip noise first
  $('script, style, nav, header, footer, iframe, noscript, aside, .cookie, .banner, .ad, .sidebar, .menu, .popup').remove();

  // Try job-specific selectors in priority order
  const jobSelectors = [
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[class*="job-detail"]',
    '[class*="jobDetail"]',
    '[class*="job-content"]',
    '[class*="description"]',
    '.internship_meta',         // Internshala
    '.job-description',         // Naukri
    '.job-view-layout',         // LinkedIn (usually blocked)
    'main',
    'article',
    '#job-details',
  ];

  let text = '';
  for (const selector of jobSelectors) {
    const el = $(selector).first();
    if (el.length && el.text().trim().length > 200) {
      text = el.text().replace(/\s+/g, ' ').trim();
      break;
    }
  }

  // Fallback to full body if no specific block found
  if (!text) {
    text = $('body').text().replace(/\s+/g, ' ').trim();
  }

  return text.substring(0, 3000);
}

// Detect fake job
router.post('/detect', auth, async (req, res) => {
  try {
    let { jobDescription, jobUrl } = req.body;
    if (!jobDescription && !jobUrl)
      return res.status(400).json({ error: 'Job description or URL required' });

    // If URL provided, scrape the actual page content
    if (jobUrl && !jobDescription) {
      try {
        jobDescription = await scrapeJobFromUrl(jobUrl);
      } catch (e) {
        return res.status(400).json({
          error: 'Could not fetch that URL (site may block scraping). Please paste the job description directly instead.'
        });
      }
    }

    const systemPrompt = `You are an expert in identifying fraudulent job postings, especially for the Indian job market. 
Analyze job postings for red flags. Always respond with valid JSON only.`;

    const userMessage = `Analyze this job posting for authenticity. Look for: unrealistic salaries, vague descriptions, requests for payment/documents, suspicious contact info, too-good-to-be-true offers, pressure tactics.

Return JSON:
{
  "verdict": "Genuine|Suspicious|Fake",
  "confidence": <0-100>,
  "riskScore": <0-100>,
  "redFlags": ["flag1", "flag2"],
  "greenFlags": ["positive1", "positive2"],
  "analysis": "detailed explanation",
  "recommendation": "what the user should do"
}

Job posting: ${jobDescription.substring(0, 2500)}`;

    const result = await callClaude(systemPrompt, userMessage, 800);
    const detection = parseJSON(result);
    if (!detection) return res.status(500).json({ error: 'Detection failed. Please try again.' });

    await User.findByIdAndUpdate(req.userId, { $inc: { 'stats.scansDetected': 1 } });

    res.json({ success: true, detection });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Apply to job (track)
router.post('/:id/apply', auth, async (req, res) => {
  try {
    await Promise.all([
      Job.findByIdAndUpdate(req.params.id, { $inc: { applicants: 1 } }),
      User.findByIdAndUpdate(req.userId, { $inc: { 'stats.jobsApplied': 1 } })
    ]);
    res.json({ success: true, message: 'Application tracked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;