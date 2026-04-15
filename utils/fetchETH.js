'use strict';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

/**
 * Fetches the current ETH/USD price from CoinGecko.
 * No API key required for the free tier.
 *
 * @returns {Promise<number>} ETH price in USD
 * @throws If the API returns an error or unexpected structure
 */
async function fetchETHPrice() {
  const url = `${COINGECKO_API}/simple/price?ids=ethereum&vs_currencies=usd`;

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    throw new Error(`CoinGecko request failed: ${err.message}`);
  }

  if (!res.ok) {
    throw new Error(`CoinGecko HTTP error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  const price = data?.ethereum?.usd;
  if (typeof price !== 'number' || price <= 0) {
    throw new Error(`CoinGecko returned invalid ETH price: ${JSON.stringify(data)}`);
  }

  return price;
}

module.exports = { fetchETHPrice };
