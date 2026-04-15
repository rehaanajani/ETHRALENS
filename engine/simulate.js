'use strict';

const USERS           = 5_000;
const TX_PER_USER     = 2;
const DAYS_PER_MONTH  = 30;

/**
 * Projects the economic scale cost of a contract at defined user/tx load.
 *
 * @param {number} costPerTx - Cost per single transaction in USD
 * @returns {{
 *   users:        number,
 *   txPerUser:    number,
 *   dailyTx:      number,
 *   dailyCost:    number,
 *   monthlyCost:  number
 * }}
 */
function simulate(costPerTx) {
  const dailyTx    = USERS * TX_PER_USER;
  const dailyCost  = costPerTx * dailyTx;
  const monthlyCost = dailyCost * DAYS_PER_MONTH;

  return {
    users:       USERS,
    txPerUser:   TX_PER_USER,
    dailyTx,
    dailyCost,
    monthlyCost,
  };
}

module.exports = { simulate, USERS, TX_PER_USER, DAYS_PER_MONTH };
