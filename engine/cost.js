'use strict';

/**
 * Converts raw gas units to a USD cost.
 *
 * Formula: costUSD = gas × gasPriceGwei × 1e-9 × ethPriceUSD
 *
 * @param {number} gas          - Gas units consumed
 * @param {number} gasPriceGwei - Current gas price in Gwei
 * @param {number} ethPriceUSD  - Current ETH price in USD
 * @returns {number} Cost in USD
 */
function computeCostUSD(gas, gasPriceGwei, ethPriceUSD) {
  if (!gas || gas <= 0) return 0;
  return gas * gasPriceGwei * 1e-9 * ethPriceUSD;
}

module.exports = { computeCostUSD };
