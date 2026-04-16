'use strict';

const NVIDIA_API = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = 'meta/llama3-8b-instruct';

/**
 * Generates a concise AI economic risk explanation using NVIDIA NIM API.
 * Returns a deterministic fallback string if no key is provided or if the call fails.
 * Never throws — the pipeline must always complete successfully.
 *
 * @param {object} opts
 * @param {string} opts.functionName - Most gas-expensive function name
 * @param {number} opts.gasUsed      - Gas units consumed
 * @param {number} opts.costUSD      - Cost per transaction in USD
 * @param {string} opts.apiKey       - NVIDIA NIM API key
 * @returns {Promise<string>}
 */
async function fetchAIExplanation({ functionName, gasUsed, costUSD, apiKey }) {
  if (!apiKey) {
    return 'AI disabled — using deterministic reasoning.';
  }

  const prompt = `You are a smart contract auditor.

Function: ${functionName || 'unknown'}
Gas used: ${gasUsed}
Cost per transaction: $${typeof costUSD === 'number' ? costUSD.toFixed(4) : costUSD}

Explain in exactly 2 short sentences:
1. Why this is expensive (technical reason)
2. One practical fix

Be specific. No generic advice.`;

  try {
    const res = await fetch(NVIDIA_API, {
      method : 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type' : 'application/json',
      },
      body  : JSON.stringify({
        model    : NVIDIA_MODEL,
        messages : [{ role: 'user', content: prompt }],
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      console.warn(`[ETHRALENS AI] NVIDIA NIM HTTP ${res.status} — using deterministic fallback.`);
      return 'AI failed — using deterministic fallback.';
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();

    if (text && text.length > 10) {
      console.log('[ETHRALENS AI] ✅ Response from: NVIDIA NIM (meta/llama3-8b-instruct)');
      return text;
    }

    return 'AI returned empty response.';
  } catch (err) {
    console.warn(`[ETHRALENS AI] NVIDIA NIM error: ${err.message} — using deterministic fallback.`);
    return 'AI failed — using deterministic fallback.';
  }
}

module.exports = { fetchAIExplanation };
