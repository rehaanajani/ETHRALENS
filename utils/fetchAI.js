'use strict';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Free model fallback chain — tried in order until one returns a response.
 * All zero-cost on OpenRouter as of 2025.
 */
const MODELS = [
  'openrouter/auto',               // #1 — OpenRouter auto-routes to best free available
  'deepseek/deepseek-r1:free',     // #2 — DeepSeek R1: best free reasoning model
  'nvidia/llama-3.1-nemotron-70b-instruct:free', // #3 — NVIDIA Nemotron 70B, 256k ctx
  'meta-llama/llama-3.3-70b-instruct:free',      // #4 — Llama 3.3 70B fallback
  'mistralai/mistral-7b-instruct:free',           // #5 — lightweight last resort
];

/**
 * Generates a concise AI economic risk explanation via OpenRouter.
 * Tries free models in priority order. Never crashes the pipeline.
 *
 * @param {object} summary
 * @param {string} summary.verdict      - SAFE | OPTIMIZE | DO_NOT_DEPLOY
 * @param {number} summary.costPerTx    - Cost per transaction in USD
 * @param {string} summary.riskLevel    - LOW | MEDIUM | HIGH
 * @param {number} summary.dropRate     - User drop-off fraction (e.g. 0.40)
 * @param {string} summary.worstFn      - Name of most gas-expensive function
 * @param {number} summary.worstGas     - Gas units used by worst function
 * @param {string} apiKey               - OpenRouter API key
 * @returns {Promise<string | null>}
 */
async function fetchAIExplanation(summary, apiKey) {
  if (!apiKey) return null;

  const prompt = [
    `You are a smart contract gas optimization expert.`,
    `Respond in exactly 2 sentences: first explain the economic risk to end users, then give the single most impactful code optimization to reduce gas.`,
    `Be specific about the function name and what to change.`,
    ``,
    `Verdict:        ${summary.verdict}`,
    `Cost per tx:    $${summary.costPerTx.toFixed(4)}`,
    `Risk level:     ${summary.riskLevel}`,
    `User drop-off:  ${(summary.dropRate * 100).toFixed(0)}%`,
    `Worst function: ${summary.worstFn} (${summary.worstGas.toLocaleString()} gas)`,
  ].join('\n');

  for (const model of MODELS) {
    try {
      const res = await fetch(OPENROUTER_API, {
        method : 'POST',
        headers: {
          'Content-Type' : 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer' : 'https://github.com/rehaanajani/ETHRALENS',
          'X-Title'      : 'ETHRALENS Gas Autopilot',
        },
        body  : JSON.stringify({
          model      : model,
          messages   : [{ role: 'user', content: prompt }],
          max_tokens : 180,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        console.warn(`[ETHRALENS AI] ${model} → HTTP ${res.status}, trying next...`);
        continue;
      }

      const data = await res.json();

      // Check for API-level errors (e.g. model not found, insufficient credits)
      if (data.error) {
        console.warn(`[ETHRALENS AI] ${model} → ${data.error.message}, trying next...`);
        continue;
      }

      const text = data?.choices?.[0]?.message?.content?.trim();

      if (text && text.length > 10) {
        // Show which model actually responded
        const shortName = model.split('/').pop().replace(':free', '');
        console.log(`[ETHRALENS AI] ✅ Response from: ${model}`);
        return `*(🤖 ${shortName})*  \n${text}`;
      }

    } catch (err) {
      console.warn(`[ETHRALENS AI] ${model} → ${err.message}, trying next...`);
    }
  }

  console.warn('[ETHRALENS AI] All models failed — skipping AI section.');
  return null; // Non-fatal — pipeline continues without AI note
}

module.exports = { fetchAIExplanation };
