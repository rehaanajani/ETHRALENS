'use strict';

/**
 * Parses `forge test --gas-report` stdout into a gas map.
 *
 * Handles both Foundry table formats:
 *   Old: ║ functionName ║ min ║ avg ║ median ║ max ║ calls ║
 *   New: │ functionName │ min │ avg │ median │ max │ calls │
 *
 * @param {string} output - Raw stdout from forge
 * @returns {{ [functionName: string]: number }} - Map of function → avg gas
 */
function parseGasReport(output) {
  const results = {};

  // Match table rows: separator | identifier | number (min) | number (avg) | ...
  // The function name must start with a letter, _, or $ (valid Solidity identifier start).
  const ROW_REGEX = /[│║]\s*([a-zA-Z_$][a-zA-Z0-9_$(,\s]*)\s*[│║]\s*(\d[\d,]*)\s*[│║]\s*(\d[\d,]*)/g;

  let match;
  while ((match = ROW_REGEX.exec(output)) !== null) {
    const rawName = match[1].trim();
    // Avg gas is the 3rd column (index 3 = match[3])
    const avgGas = parseInt(match[3].replace(/,/g, ''), 10);

    // Skip header rows and deployment rows
    if (
      rawName.toLowerCase().includes('function name') ||
      rawName.toLowerCase().includes('deployment') ||
      isNaN(avgGas) ||
      avgGas <= 0
    ) {
      continue;
    }

    // Keep the highest avg seen if a function appears multiple times
    if (!results[rawName] || results[rawName] < avgGas) {
      results[rawName] = avgGas;
    }
  }

  return results;
}

module.exports = { parseGasReport };
