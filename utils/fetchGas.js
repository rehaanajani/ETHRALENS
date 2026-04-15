'use strict';

const ETHERSCAN_API = 'https://api.etherscan.io/api';

/**
 * Fetches the current "average" (ProposeGasPrice) gas price from Etherscan.
 *
 * @param {string} apiKey - Etherscan API key
 * @returns {Promise<number>} Gas price in Gwei
 * @throws If the API returns an error or unexpected structure
 */
async function fetchGasPrice(apiKey) {
  const url = `${ETHERSCAN_API}?module=gastracker&action=gasoracle&apikey=${apiKey}`;

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    throw new Error(`Etherscan request failed: ${err.message}`);
  }

  if (!res.ok) {
    throw new Error(`Etherscan HTTP error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  if (data.status !== '1' || !data.result?.ProposeGasPrice) {
    if (data.message === 'NOTOK') {
      console.warn(`⚠️ Etherscan warning: ${data.result}. Falling back to 15 Gwei.`);
      return 15.0;
    }
    throw new Error(`Etherscan GasOracle error: ${data.message || JSON.stringify(data)}`);
  }

  const gwei = parseFloat(data.result.ProposeGasPrice);
  if (isNaN(gwei) || gwei <= 0) {
    throw new Error(`Etherscan returned invalid gas price: ${data.result.ProposeGasPrice}`);
  }

  return gwei;
}

module.exports = { fetchGasPrice };
