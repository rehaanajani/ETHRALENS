'use strict';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Model fallback chain — tried in order until one succeeds.
 * All are free on OpenRouter as of 2025.
 */
const MODELS = [
  'deepseek/deepseek-r1:free',               // #1 — best reasoning, free
  'meta-llama/llama-3.3-70b-instruct:free',  // #2 — Llama 3.3 70B, very capable
  'mistralai/mistral-7b-instruct:free',      // #3 — lightweight fallback
];

/**
 * Generates a concise AI economic risk explanation using the best available
 * free model on OpenRouter. Tries models in priority order, returns null
 * if ALL fail — never crashes the pipeline.
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
    `Respond in exactly 2 sentences: first explain the economic risk to users, then give the single most impactful optimization to reduce gas cost.`,
    ``,
    `Contract verdict: ${summary.verdict}`,
    `Cost per transaction: $${summary.costPerTx.toFixed(4)}`,
    `Risk level: ${summary.riskLevel}`,
    `User drop-off rate: ${(summary.dropRate * 100).toFixed(0)}%`,
    `Most expensive function: ${summary.worstFn} (${summary.worstGas.toLocaleString()} gas)`,
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
          max_tokens : 150,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) continue; // try next model

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();

      if (text) {
        console.log(`[ETHRALENS AI] Used model: ${model}`);
        return `*(${model.split('/')[1]})*  \n${text}`;
      }
    } catch {
      // timeout or network error — try next model
    }
  }

  return null; // all models failed — non-fatal
}

module.exports = { fetchAIExplanation };
