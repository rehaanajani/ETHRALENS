'use strict';

const VERDICTS = Object.freeze({
  DO_NOT_DEPLOY : 'DO_NOT_DEPLOY',
  OPTIMIZE      : 'OPTIMIZE',
  SAFE          : 'SAFE',
});

/**
 * Determines the final deployment verdict.
 *
 * Rules (in priority order):
 *   1. cost > $5 AND dropRate > 50%  → DO NOT DEPLOY
 *   2. cost > $3                     → OPTIMIZE
 *   3. otherwise                     → SAFE
 *
 * @param {number} costPerTx - Cost per transaction in USD
 * @param {number} dropRate  - User drop-off fraction (e.g. 0.70)
 * @returns {'DO_NOT_DEPLOY' | 'OPTIMIZE' | 'SAFE'}
 */
function decide(costPerTx, dropRate) {
  if (costPerTx > 5 && dropRate > 0.5) return VERDICTS.DO_NOT_DEPLOY;
  if (costPerTx > 3)                   return VERDICTS.OPTIMIZE;
  return VERDICTS.SAFE;
}

module.exports = { decide, VERDICTS };
