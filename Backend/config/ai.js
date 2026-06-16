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

function parseJSON(text) {
  try {
    // Try direct parse first
    return JSON.parse(text.trim());
  } catch {}

  try {
    // Strip markdown code fences
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {}

  try {
    // Extract first JSON object found anywhere in the text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}

  return null;
}

module.exports = { callClaude, parseJSON };