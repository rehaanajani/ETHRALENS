# ⛽ ETHRALENS

> **Autopilot for Smart Contract Economics**

A production-grade GitHub Action that automatically analyzes Solidity contract gas costs, converts them to live USD values, simulates at-scale economic impact, and posts a full risk report on every pull request.

---

## How It Works

```
forge test --gas-report
        │
        ▼
  Parse gas table
        │
        ▼
 Fetch live gas price (Etherscan)
 Fetch live ETH price (CoinGecko)
        │
        ▼
  costUSD = gas × gasPriceGwei × 1e-9 × ethPriceUSD
        │
        ▼
  Simulate: 5000 users × 2 tx/day × 30 days
        │
        ▼
  Risk model → Drop-off rate
        │
        ▼
  Decision engine → SAFE / OPTIMIZE / DO NOT DEPLOY
        │
        ▼
  Post PR comment + (optionally) fail CI
```

---

## Usage

Add to your Solidity repo's `.github/workflows/ethralens.yml`:

```yaml
name: ETHRALENS Gas Analysis

on:
  pull_request:
    branches: [main, master]
    paths: ['**.sol']

permissions:
  contents: read
  pull-requests: write

jobs:
  ethralens:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
        with:
          version: nightly

      - name: Run ETHRALENS
        uses: YOUR_ORG/ethralens-action@v1
        with:
          etherscan_api_key: ${{ secrets.ETHERSCAN_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          nvidia_api_key: ${{ secrets.NVIDIA_API_KEY }} # optional
          forge_test_path: '.'
```

---

## Required Secrets

| Secret              | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `ETHERSCAN_API_KEY` | Fetches live gas price                                           |
| `NVIDIA_API_KEY`    | Optional — enables AI explanation                                |
| `ALCHEMY_RPC_URL`   | Optional — enables mainnet forking for advanced contract testing |

`GITHUB_TOKEN` is provided automatically by GitHub Actions.

---

## 🔑 Demo API Keys (For Judges Only)

For quick testing, you can use these temporary keys:

```
ETHERSCAN_API_KEY = <FJTP59EC2JKN1X166TGE99NKF8JPBWRK82>
NVIDIA_API_KEY    = <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>
ALCHEMY_RPC_URL   = <https://eth-mainnet.g.alchemy.com/v2/sd7D5EnBKTidu8kkEUhCH>
```

⚠️ These keys are rate-limited and may expire after the hackathon.

---

## 🧠 About ALCHEMY_RPC_URL

`ALCHEMY_RPC_URL` allows ETHRALENS to connect to a live Ethereum node via Alchemy.

This is used for **mainnet forking in Foundry**, which enables:

* Testing contracts against real on-chain state
* Interacting with live DeFi protocols during tests

👉 Not required for basic usage, but useful for advanced real-world simulations.

---

## Verdict Logic

| Condition                        | Verdict                         |
| -------------------------------- | ------------------------------- |
| `cost > $5` AND `drop-off > 50%` | 🚫 **DO NOT DEPLOY** — fails CI |
| `cost > $3`                      | ⚠️ **OPTIMIZE** — warning       |
| Otherwise                        | ✅ **SAFE**                      |

## Drop-off Model

| Cost per Tx   | Risk Level | User Drop-off |
| ------------- | ---------- | ------------- |
| < $2.00       | 🟢 LOW     | 10%           |
| $2.00 – $5.00 | 🟡 MEDIUM  | 40%           |
| > $5.00       | 🔴 HIGH    | 70%           |

---

## Project Structure

```
ethralens-action/
├── action.yml          — Action metadata & input/output definitions
├── index.js            — Pipeline orchestrator (12 steps)
├── package.json
├── engine/
│   ├── gas.js          — Forge gas report parser
│   ├── cost.js         — Gas → USD conversion
│   ├── simulate.js     — Scale simulation model
│   ├── risk.js         — Risk & drop-off assessment
│   └── decision.js     — SAFE / OPTIMIZE / DO NOT DEPLOY verdict
└── utils/
    ├── fetchGas.js     — Etherscan gas price API
    ├── fetchETH.js     — CoinGecko ETH price API
    ├── fetchAI.js      — NVIDIA AI explanation (optional)
    └── formatter.js    — Markdown PR comment builder
```

---

## Publishing This Action

```bash
npm install
npm run build         # Bundles everything into dist/index.js via ncc
git add dist/
git commit -m "build: bundle action"
git tag v1.0.0
git push origin v1.0.0
```

---

## Sample PR Comment

```
## ⛽ ETHRALENS AUTOPILOT

> Autonomous Economic Risk Analysis for Smart Contracts

### 📊 Gas Snapshot
| Function  | Avg Gas   | Cost / Tx  |
|-----------|----------:|-----------:|
| transfer  | 51,234    | $0.0821    |
| approve   | 46,012    | $0.0738    |

### 💰 Cost Analysis
| Metric           | Value        |
|------------------|-------------:|
| Gas Price (live) | 18 Gwei      |
| ETH Price (live) | $3,200       |
| Cost per Txn     | $0.0821      |

### 📈 At Scale
*(5,000 users × 2 tx/day × 30 days)*
| Timeframe | Projected Cost |
|-----------|---------------:|
| Daily     | $821.00        |
| Monthly   | $24,630.00     |

### 🔍 Economic Risk
| Factor          | Value   |
|-----------------|--------:|
| Risk Level      | 🟢 LOW  |
| User Drop-off   | 10%     |
| Cost Breakpoint | $2.00   |

### FINAL VERDICT: ✅ SAFE
```

---
Demo trigger
## License

MIT
