'use strict';

/**
 * Risk tiers:
 *   LOW    → cost < $2    → 10% user drop-off
 *   MEDIUM → $2 ≤ cost ≤ $5 → 40% user drop-off
 *   HIGH   → cost > $5   → 70% user drop-off
 *
 * Breakpoint: the next cost threshold that would push into a higher tier,
 * or the current cost if already HIGH.
 *
 * @param {number} costPerTx - Cost per transaction in USD
 * @returns {{
 *   riskLevel:  'LOW' | 'MEDIUM' | 'HIGH',
 *   dropRate:   number,   // fraction, e.g. 0.10
 *   breakpoint: number    // USD threshold
 * }}
 */
function assessRisk(costPerTx) {
  if (costPerTx < 2) {
    return { riskLevel: 'LOW',    dropRate: 0.10, breakpoint: 2.00 };
  }
  if (costPerTx <= 5) {
    return { riskLevel: 'MEDIUM', dropRate: 0.40, breakpoint: 5.00 };
  }
  return   { riskLevel: 'HIGH',   dropRate: 0.70, breakpoint: costPerTx };
}

module.exports = { assessRisk };
