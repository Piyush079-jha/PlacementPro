const fetch = require('node-fetch');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callClaude(systemPrompt, userMessage, maxTokens = 1500) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Groq API call failed');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

const { jsonrepair } = require('jsonrepair');

function parseJSON(text) {
  try {
    // Try direct parse first
    return JSON.parse(text.trim());
  } catch {}

  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {}

  // Fallback: attempt to auto-repair common AI JSON issues
  // (unescaped quotes inside string values, trailing commas, etc.)
  try {
    return JSON.parse(jsonrepair(cleaned));
  } catch {}

  try {
    // Extract first JSON structure found anywhere in the text, then repair it
    const match = cleaned.match(/[\{\[][\s\S]*[\}\]]/);
    if (match) return JSON.parse(jsonrepair(match[0]));
  } catch {}

  return null;
}

module.exports = { callClaude, parseJSON };