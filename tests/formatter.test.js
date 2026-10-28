'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { formatReport } = require('../utils/formatter');

const base = {
  costPerTx   : 1.23,
  simulation  : { users: 5000, txPerUser: 2, dailyCost: 100, monthlyCost: 3000 },
  risk        : { riskLevel: 'LOW', dropRate: 0.1, breakpoint: 2 },
  verdict     : '✅ SAFE',
  gasData     : { gasPriceGwei: 20, ethPriceUSD: 3000 },
  topFunctions: [['deposit', 43500]],
};

test('renders the gas table and verdict', () => {
  const report = formatReport(base);
  assert.match(report, /\| `deposit` \| 43,500 \| \$2\.6100 \|/);
  assert.match(report, /FINAL VERDICT: ✅ SAFE/);
  assert.doesNotMatch(report, /AI Analysis/);
});

test('quotes every line of a multi-line AI note', () => {
  const report = formatReport({ ...base, aiNote: 'First sentence.\nSecond sentence.' });
  assert.match(report, /> First sentence\.\n> Second sentence\./);
});
