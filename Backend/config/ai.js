const fetch = require('node-fetch');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Comma-separated list in .env, e.g. GROQ_API_KEYS=key1,key2,key3
// Falls back to single GROQ_API_KEY if that's all you have.
const GROQ_KEYS = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

let keyCursor = 0;
const nextKey = () => {
  const key = GROQ_KEYS[keyCursor % GROQ_KEYS.length];
  keyCursor++;
  return key;
};

// Fast model for bulk/low-stakes generation (MCQs, coding problems).
// Quality model reserved for evaluation/feedback where nuance matters.
const MODELS = {
  fast: 'llama-3.1-8b-instant',
  quality: 'llama-3.3-70b-versatile'
};

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function singleCall(systemPrompt, userMessage, maxTokens, model, apiKey) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = err.error?.message || 'Groq API call failed';
    const isRateLimit = response.status === 429;
    // Groq embeds the wait time in the message, e.g. "try again in 6.625s"
    const match = message.match(/try again in ([\d.]+)s/i);
    const retryAfterMs = match ? Math.ceil(parseFloat(match[1]) * 1000) : 2000;
    const e = new Error(message);
    e.isRateLimit = isRateLimit;
    e.retryAfterMs = retryAfterMs;
    throw e;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// tier: 'fast' (default, for bulk generation) or 'quality' (for evaluation/feedback)
async function callClaude(systemPrompt, userMessage, maxTokens = 1500, tier = 'fast') {
  if (!GROQ_KEYS.length) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const model = MODELS[tier] || MODELS.fast;
  const maxAttempts = GROQ_KEYS.length * 2; // give each key up to 2 tries
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const apiKey = nextKey();
    try {
      return await singleCall(systemPrompt, userMessage, maxTokens, model, apiKey);
    } catch (err) {
      lastError = err;
      if (err.isRateLimit) {
        // Rotating to the next key already happens via nextKey() on retry.
        // Only sleep if we've cycled through all keys once (they're all likely limited).
        if (attempt > 0 && attempt % GROQ_KEYS.length === GROQ_KEYS.length - 1) {
          await sleep(err.retryAfterMs);
        }
        continue;
      }
      throw err; // non-rate-limit errors fail immediately
    }
  }
  throw lastError;
}

// Same as callClaude but never throws — returns null on total failure so
// callers can fall back to a cached question bank instead of showing an error.
async function callClaudeSafe(systemPrompt, userMessage, maxTokens = 1500, tier = 'fast') {
  try {
    return await callClaude(systemPrompt, userMessage, maxTokens, tier);
  } catch (err) {
    console.error('[Groq] All retries/keys exhausted:', err.message);
    return null;
  }
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

module.exports = { callClaude, callClaudeSafe, parseJSON };