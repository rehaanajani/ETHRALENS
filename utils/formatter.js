'use strict';

const VERDICT_LABEL = {
  DO_NOT_DEPLOY : '🚫 DO NOT DEPLOY',
  OPTIMIZE      : '⚠️  OPTIMIZE',
  SAFE          : '✅ SAFE',
};

const RISK_ICON = {
  LOW    : '🟢',
  MEDIUM : '🟡',
  HIGH   : '🔴',
};

/**
 * Builds a Markdown PR comment report.
 *
 * @param {object}   opts
 * @param {number}   opts.costPerTx      - Cost per tx in USD
 * @param {object}   opts.simulation     - Output from simulate()
 * @param {object}   opts.risk           - Output from assessRisk()
 * @param {string}   opts.verdict        - Output from decide()
 * @param {object}   opts.gasData        - { gasPriceGwei, ethPriceUSD }
 * @param {[string, number][]} opts.topFunctions - Sorted [fn, avgGas] pairs
 * @param {string|null} opts.aiNote      - Optional AI explanation string
 * @returns {string} Rendered Markdown
 */
function formatReport({ costPerTx, simulation, risk, verdict, gasData, topFunctions, aiNote }) {
  const { gasPriceGwei, ethPriceUSD } = gasData;

  const lines = [
    '## ⛽ ETHRALENS AUTOPILOT',
    '',
    '> *Autonomous Economic Risk Analysis for Smart Contracts*',
    '',
    '---',
    '',
    '### 📊 Gas Snapshot',
    '',
    '| Function | Avg Gas | Cost / Tx |',
    '|----------|--------:|----------:|',
    ...topFunctions.map(([fn, gas]) => {
      const cost = gas * gasPriceGwei * 1e-9 * ethPriceUSD;
      return `| \`${fn}\` | ${gas.toLocaleString()} | $${cost.toFixed(4)} |`;
    }),
    '',
    '---',
    '',
    '### 💰 Cost Analysis',
    '',
    '| Metric | Value |',
    '|--------|------:|',
    `| Gas Price (live) | ${gasPriceGwei} Gwei |`,
    `| ETH Price (live) | $${ethPriceUSD.toLocaleString()} |`,
    `| **Cost per Txn** | **$${costPerTx.toFixed(4)}** |`,
    '',
    '---',
    '',
    '### 📈 At Scale',
    `*(${simulation.users.toLocaleString()} users × ${simulation.txPerUser} tx/day × 30 days)*`,
    '',
    '| Timeframe | Projected Cost |',
    '|-----------|---------------:|',
    `| Daily     | $${simulation.dailyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |`,
    `| Monthly   | $${simulation.monthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |`,
    '',
    '---',
    '',
    '### 🔍 Economic Risk',
    '',
    '| Factor | Value |',
    '|--------|------:|',
    `| Risk Level   | ${RISK_ICON[risk.riskLevel]} ${risk.riskLevel} |`,
    `| User Drop-off | ${(risk.dropRate * 100).toFixed(0)}% |`,
    `| Cost Breakpoint | $${risk.breakpoint.toFixed(2)} |`,
    '',
    '---',
    '',
    `### FINAL VERDICT: ${VERDICT_LABEL[verdict]}`,
    '',
  ];

  // Optional AI section
  if (aiNote) {
    lines.push(
      '---',
      '',
      '### 🤖 AI Analysis *(Mistral)*',
      '',
      `> ${aiNote}`,
      '',
    );
  }

  lines.push(
    '---',
    '',
    '<sub>Powered by <strong>ETHRALENS</strong> · Gas data: Etherscan · Price data: CoinGecko</sub>',
  );

  return lines.join('\n');
}

module.exports = { formatReport };
