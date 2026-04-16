'use strict';

/**
 * Risk tiers — evaluated on BOTH dollar cost AND raw gas units.
 * Gas-unit thresholds catch architecturally wasteful contracts even
 * when network fees are temporarily low.
 *
 *   HIGH   → cost > $5   OR  gasUnits > 100,000  → 🚫 DO NOT DEPLOY
 *   MEDIUM → cost ≥ $2   OR  gasUnits > 50,000   → ⚠️ OPTIMIZE
 *   LOW    → otherwise                             → ✅ SAFE
 *
 * @param {number} costPerTx - Cost per transaction in USD
 * @param {number} gasUnits  - Raw gas units consumed by worst function
 * @returns {{ riskLevel: 'LOW'|'MEDIUM'|'HIGH', dropRate: number, breakpoint: number }}
 */
function assessRisk(costPerTx, gasUnits = 0) {
  if (costPerTx > 5 || gasUnits > 100_000) {
    return { riskLevel: 'HIGH',   dropRate: 0.70, breakpoint: costPerTx };
  }
  if (costPerTx >= 2 || gasUnits > 50_000) {
    return { riskLevel: 'MEDIUM', dropRate: 0.40, breakpoint: 5.00 };
  }
  return   { riskLevel: 'LOW',    dropRate: 0.10, breakpoint: 2.00 };
}

module.exports = { assessRisk };

