'use strict';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL          = 'mistralai/mistral-7b-instruct';

/**
 * Generates a concise AI economic risk explanation using Mistral via OpenRouter.
 * Returns null if no API key is provided or if the call fails (non-fatal).
 *
 * @param {object} summary
 * @param {string} summary.verdict      - SAFE | OPTIMIZE | DO_NOT_DEPLOY
 * @param {number} summary.costPerTx    - Cost per tx in USD
 * @param {string} summary.riskLevel    - LOW | MEDIUM | HIGH
 * @param {number} summary.dropRate     - User drop-off fraction
 * @param {string} summary.worstFn      - Worst function name
 * @param {number} summary.worstGas     - Gas used by worst function
 * @param {string} apiKey               - OpenRouter API key
 * @returns {Promise<string | null>}
 */
async function fetchAIExplanation(summary, apiKey) {
  if (!apiKey) return null;

  const prompt = [
    `You are a smart contract gas optimization expert.`,
    `Analyze this report and respond in exactly 2 sentences: one explaining the economic risk, one giving the most impactful optimization.`,
    ``,
    `Contract verdict: ${summary.verdict}`,
    `Cost per tx: $${summary.costPerTx.toFixed(4)}`,
    `Risk level: ${summary.riskLevel}`,
    `User drop-off: ${(summary.dropRate * 100).toFixed(0)}%`,
    `Most expensive function: ${summary.worstFn} (${summary.worstGas.toLocaleString()} gas)`,
  ].join('\n');

  try {
    const res = await fetch(OPENROUTER_API, {
      method  : 'POST',
      headers : {
        'Content-Type' : 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer' : 'https://github.com/ethralens/ethralens-action',
        'X-Title'      : 'ETHRALENS',
      },
      body    : JSON.stringify({
        model       : MODEL,
        messages    : [{ role: 'user', content: prompt }],
        max_tokens  : 120,
        temperature : 0.2,
      }),
      signal  : AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null; // AI is optional — never fail the pipeline
  }
}

module.exports = { fetchAIExplanation };
