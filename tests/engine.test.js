'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { parseGasReport } = require('../engine/gas');
const { computeCostUSD } = require('../engine/cost');
const { simulate } = require('../engine/simulate');
const { assessRisk } = require('../engine/risk');
const { decide, VERDICTS } = require('../engine/decision');

const TABLE_OUTPUT = `
[PASS] test_Deposit() (gas: 98000)
[PASS] test_Withdraw() (gas: 120500)
╭──────────────────────────────────────┬─────────────────┬───────┬────────┬───────┬─────────╮
│ src/SimpleVault.sol:SimpleVault      │                 │       │        │       │         │
├──────────────────────────────────────┼─────────────────┼───────┼────────┼───────┼─────────┤
│ Deployment Cost                      │ Deployment Size │       │        │       │         │
│ 250000                               │ 1100            │       │        │       │         │
│ Function Name                        │ Min             │ Avg   │ Median │ Max   │ # Calls │
│ deposit                              │ 22000           │ 43500 │ 43500  │ 65000 │ 2       │
│ withdraw                             │ 9000            │ 30100 │ 30100  │ 51200 │ 2       │
╰──────────────────────────────────────┴─────────────────┴───────┴────────┴───────┴─────────╯
`;

test('parses avg gas from the gas-report table', () => {
  assert.deepEqual(parseGasReport(TABLE_OUTPUT), { deposit: 43500, withdraw: 30100 });
});

test('ignores test-function gas when a table is present', () => {
  const gas = parseGasReport(TABLE_OUTPUT);
  assert.equal(gas.test_Deposit, undefined);
  assert.equal(gas.test_Withdraw, undefined);
});

test('falls back to test lines and fuzz means without a table', () => {
  const gas = parseGasReport(`
[PASS] test_Deposit() (gas: 63891)
[FAIL] test_Withdraw() (gas: 9123)
[PASS] testFuzz_Deposit(uint256) (runs: 256, μ: 30877, ~: 31288)
`);
  assert.deepEqual(gas, { test_Deposit: 63891, test_Withdraw: 9123, testFuzz_Deposit: 30877 });
});

test('parses the legacy double-line table', () => {
  const gas = parseGasReport('║ deposit ║ 22000 ║ 43500 ║ 43500 ║ 65000 ║ 2 ║');
  assert.deepEqual(gas, { deposit: 43500 });
});

test('returns an empty map for output without gas data', () => {
  assert.deepEqual(parseGasReport('No tests found'), {});
});

test('computes USD cost from gas, gwei and ETH price', () => {
  // 100k gas × 20 gwei = 0.002 ETH; × $3000 = $6
  assert.ok(Math.abs(computeCostUSD(100_000, 20, 3000) - 6) < 1e-9);
  assert.equal(computeCostUSD(0, 20, 3000), 0);
});

test('simulates 5,000 users × 2 tx/day × 30 days', () => {
  const sim = simulate(0.5);
  assert.equal(sim.dailyTx, 10_000);
  assert.equal(sim.dailyCost, 5000);
  assert.equal(sim.monthlyCost, 150_000);
});

test('risk tiers on both cost and gas units', () => {
  assert.equal(assessRisk(1, 30_000).riskLevel, 'LOW');
  assert.equal(assessRisk(2, 30_000).riskLevel, 'MEDIUM');
  assert.equal(assessRisk(1, 60_000).riskLevel, 'MEDIUM');
  assert.equal(assessRisk(6, 30_000).riskLevel, 'HIGH');
  assert.equal(assessRisk(0.1, 150_000).riskLevel, 'HIGH');
});

test('verdict follows risk level', () => {
  assert.equal(decide({ riskLevel: 'HIGH' }), VERDICTS.DO_NOT_DEPLOY);
  assert.equal(decide({ riskLevel: 'MEDIUM' }), VERDICTS.OPTIMIZE);
  assert.equal(decide({ riskLevel: 'LOW' }), VERDICTS.SAFE);
});
