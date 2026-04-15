'use strict';

/**
 * Parses `forge test --gas-report` stdout into a gas map.
 *
 * Handles three formats:
 *   1. Table rows (all tests pass)
 *        Old: ║ functionName ║ min ║ avg ║ median ║ max ║ calls ║
 *        New: │ functionName │ min │ avg │ median │ max │ calls │
 *   2. Individual test results (any test outcome)
 *        [PASS] test_Name() (gas: 12345)
 *        [FAIL] test_Name() (gas: 12345)
 *   3. Fuzz test results (avg gas)
 *        [PASS] testFuzz_Name(uint256) (runs: 256, μ: 30877, ~: 31288)
 *
 * @param {string} output - Raw stdout from forge
 * @returns {{ [functionName: string]: number }} - Map of function → avg gas
 */
function parseGasReport(output) {
  const results = {};

  // ── Strategy 1: Full gas report table ────────────────────────────────────
  // Match table rows: separator | identifier | number (min) | number (avg)
  const TABLE_REGEX = /[│║]\s*([a-zA-Z_$][a-zA-Z0-9_$(,\s]*)\s*[│║]\s*(\d[\d,]*)\s*[│║]\s*(\d[\d,]*)/g;
  let match;
  while ((match = TABLE_REGEX.exec(output)) !== null) {
    const rawName = match[1].trim();
    const avgGas  = parseInt(match[3].replace(/,/g, ''), 10);

    if (
      rawName.toLowerCase().includes('function name') ||
      rawName.toLowerCase().includes('deployment') ||
      isNaN(avgGas) ||
      avgGas <= 0
    ) continue;

    if (!results[rawName] || results[rawName] < avgGas) {
      results[rawName] = avgGas;
    }
  }

  // ── Strategy 2: Individual test result lines ──────────────────────────────
  // [PASS] test_Deposit() (gas: 63891)
  // [FAIL] test_Withdraw() (gas: 9123)
  const TEST_LINE_REGEX = /\[(?:PASS|FAIL)\]\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\([^)]*\)\s+\(gas:\s*(\d+)\)/g;
  while ((match = TEST_LINE_REGEX.exec(output)) !== null) {
    const name = match[1].trim();
    const gas  = parseInt(match[2], 10);
    if (name && !isNaN(gas) && gas > 0) {
      // Only add if not already captured from table (table has more precise avg)
      if (!results[name]) {
        results[name] = gas;
      }
    }
  }

  // ── Strategy 3: Fuzz test result lines (use μ = mean) ────────────────────
  // [PASS] testFuzz_Name(uint256) (runs: 256, μ: 30877, ~: 31288)
  const FUZZ_REGEX = /\[(?:PASS|FAIL)\]\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\([^)]+\)\s+\(runs:\s*\d+,\s*μ:\s*(\d+)/g;
  while ((match = FUZZ_REGEX.exec(output)) !== null) {
    const name   = match[1].trim();
    const meanGas = parseInt(match[2], 10);
    if (name && !isNaN(meanGas) && meanGas > 0 && !results[name]) {
      results[name] = meanGas;
    }
  }

  return results;
}

module.exports = { parseGasReport };
