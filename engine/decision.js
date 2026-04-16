'use strict';

const VERDICTS = Object.freeze({
  DO_NOT_DEPLOY : '🚫 DO NOT DEPLOY',
  OPTIMIZE      : '⚠️ OPTIMIZE',
  SAFE          : '✅ SAFE',
});

/**
 * Determines the final deployment verdict based on risk level.
 *
 * @param {object} args
 * @param {string} args.riskLevel - LOW | MEDIUM | HIGH
 * @param {number} args.costUSD   - Optional costUSD passed from caller just in case
 * @returns {string} The formatted verdict label
 */
function decide({ riskLevel, costUSD }) {
  if (riskLevel === 'HIGH')   return VERDICTS.DO_NOT_DEPLOY;
  if (riskLevel === 'MEDIUM') return VERDICTS.OPTIMIZE;
  return VERDICTS.SAFE;
}

module.exports = { decide, VERDICTS };
