'use strict';

const NVIDIA_API = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = 'meta/llama3-8b-instruct';

const DETERMINISTIC_FALLBACK = "High gas usage detected due to inefficient storage operations. Optimize by reducing SSTORE calls or caching values in memory.";

/**
 * Generates a concise AI economic risk explanation using NVIDIA NIM API.
 * Returns a static, clean fallback string if no key is provided or if the call fails.
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
    return DETERMINISTIC_FALLBACK;
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
      return DETERMINISTIC_FALLBACK;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();

    if (text && text.length > 10) {
      return text;
    }

    return DETERMINISTIC_FALLBACK;
  } catch (err) {
    return DETERMINISTIC_FALLBACK;
  }
}

module.exports = { fetchAIExplanation };
