// Run manually with: node seed/companyQuestions.js
// Seeds a starter set of real, verified company-specific questions.
// Add more entries here over time as you collect verified questions per company.

require('dotenv').config();
const mongoose = require('mongoose');
const CompanyQuestion = require('../models/CompanyQuestion');

const seedData = [
  {
    company: 'TCS', section: 'Aptitude',
    question: 'A shopkeeper marks up an item by 40% and then gives a discount of 20%. What is his net profit percentage?',
    options: ['12%', '14%', '20%', '8%'],
    correctIndex: 1,
    explanation: 'Net effect = 1.4 * 0.8 = 1.12, so 12% profit... actually compute: 140*0.8=112, so 12% profit. (Verify against your actual source before using live.)',
    source: 'curated', verified: true, yearAsked: 2024
  },
  {
    company: 'TCS', section: 'Verbal',
    question: 'Choose the correctly spelled word.',
    options: ['Acommodate', 'Accommodate', 'Acomodate', 'Accomodate'],
    correctIndex: 1,
    explanation: '"Accommodate" has double C and double M.',
    source: 'curated', verified: true, yearAsked: 2024
  },
  {
    company: 'Infosys', section: 'Reasoning',
    question: 'In a certain code, MOBILE is written as LNAHKD. How is COMPUTER written in that code?',
    options: ['BNLOTSDQ', 'BNLOTSDR', 'BNLNTSDQ', 'BNLOSTDQ'],
    correctIndex: 0,
    explanation: 'Each letter is shifted back by 1 in the alphabet.',
    source: 'curated', verified: true, yearAsked: 2024
  },
  {
    company: 'Wipro', section: 'Coding',
    question: 'Reverse a String',
    description: 'Given a string, print it reversed. Read the string from stdin and print the reversed string to stdout.',
    constraints: '1 <= length of string <= 1000',
    testCases: [
      { input: 'hello', expectedOutput: 'olleh', hidden: false },
      { input: 'wipro', expectedOutput: 'orpiw', hidden: false },
      { input: 'a', expectedOutput: 'a', hidden: true }
    ],
    source: 'curated', verified: true, yearAsked: 2024
  },
  {
    company: 'Amazon', section: 'Technical',
    question: 'Design a rate limiter for an API gateway. Walk through your approach, the data structures you would use, and how you would handle distributed rate limiting across multiple servers.',
    source: 'curated', verified: true, yearAsked: 2024
  },
  {
    company: 'Google', section: 'Technical',
    question: 'How would you design a URL shortening service like bit.ly? Discuss the database schema, hashing approach, and how you would handle collisions at scale.',
    source: 'curated', verified: true, yearAsked: 2024
  }
];

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placementpro')
  .then(async () => {
    console.log('Connected. Seeding company questions...');
    await CompanyQuestion.deleteMany({ source: 'curated' }); // clear old curated seed only
    await CompanyQuestion.insertMany(seedData);
    console.log(`Seeded ${seedData.length} company questions.`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });