'use strict';

// ─── GitHub Actions SDK ───────────────────────────────────────────────────────
const core   = require('@actions/core');
const github = require('@actions/github');

// ─── Node built-ins ──────────────────────────────────────────────────────────
const { execFileSync } = require('child_process');

// ─── Engine ──────────────────────────────────────────────────────────────────
const { parseGasReport }    = require('./engine/gas');
const { computeCostUSD }    = require('./engine/cost');
const { simulate }          = require('./engine/simulate');
const { assessRisk }        = require('./engine/risk');
const { decide, VERDICTS }  = require('./engine/decision');

// ─── Utils ───────────────────────────────────────────────────────────────────
const { fetchGasPrice }     = require('./utils/fetchGas');
const { fetchETHPrice }     = require('./utils/fetchETH');
const { fetchAIExplanation} = require('./utils/fetchAI');
const { formatReport }      = require('./utils/formatter');

// Hidden marker so later runs can find and update their own comment
const COMMENT_MARKER = '<!-- ethralens-report -->';

/**
 * Post the report on the PR, editing the previous ETHRALENS comment if there
 * is one so repeated pushes don't stack up duplicate reports.
 */
async function upsertPRComment(token, report) {
  const { context } = github;
  if (!context.payload.pull_request) {
    core.info('Not a pull_request event — skipping PR comment.');
    return;
  }

  const body = `${COMMENT_MARKER}\n${report}`;
  const { owner, repo } = context.repo;
  const issue_number = context.payload.pull_request.number;

  try {
    const octokit  = github.getOctokit(token);
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      owner, repo, issue_number, per_page: 100,
    });
    const existing = comments.find((c) => c.body?.includes(COMMENT_MARKER));

    if (existing) {
      await octokit.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
      core.info('✅ PR comment updated.');
    } else {
      await octokit.rest.issues.createComment({ owner, repo, issue_number, body });
      core.info('✅ PR comment posted.');
    }
  } catch (e) {
    core.warning(`Failed to post PR comment: ${e.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function run() {
  try {

    // ── Inputs ──────────────────────────────────────────────────────────────
    const etherscanKey   = core.getInput('etherscan_api_key',  { required: true });
    const githubToken    = core.getInput('github_token',       { required: true });
    const nvidiaKey      = core.getInput('nvidia_api_key')      || '';
    const forgePath      = core.getInput('forge_test_path')    || '.';
    const alchemyRpcUrl  = core.getInput('alchemy_rpc_url')    || '';
    if (alchemyRpcUrl) core.setSecret(alchemyRpcUrl); // RPC URLs often embed an API key

    // ── Step 1: Run `forge test --gas-report` ───────────────────────────────
    core.startGroup('⛽ Running forge test --gas-report');
    // Pass args as an array (no shell) so RPC URLs with &, ; or $ are safe
    const forgeArgs = ['test', '--gas-report'];
    if (alchemyRpcUrl) forgeArgs.push('--fork-url', alchemyRpcUrl);
    core.info(`Command: forge test --gas-report${alchemyRpcUrl ? ' --fork-url <RPC>' : ''}`);
    let forgeOutput = '';
    try {
      forgeOutput = execFileSync('forge', forgeArgs, {
        cwd     : forgePath,
        encoding: 'utf8',
        stdio   : ['ignore', 'pipe', 'pipe'],
        maxBuffer: 10 * 1024 * 1024, // 10 MB
      });
    } catch (err) {
      // forge exits non-zero when some tests fail but still emits gas data
      forgeOutput = `${err.stdout || ''}${err.stderr || ''}` || err.message || '';
      if (!forgeOutput.toLowerCase().includes('gas')) {
        throw new Error(`forge test produced no gas output.\n\n${forgeOutput}`);
      }
      core.warning('Some forge tests failed, but gas report was captured.');
    }
    core.info(forgeOutput);
    core.endGroup();

    // ── Step 2: Parse gas report ────────────────────────────────────────────
    const gasMap = parseGasReport(forgeOutput);

    if (Object.keys(gasMap).length === 0) {
      core.setFailed(
        'ETHRALENS: No gas data found. Make sure your Foundry project emits a gas report.\n' +
        'Check that `forge test --gas-report` runs correctly in the repo.'
      );
      return;
    }

    // Sort functions by gas (descending) — worst-case first
    const topFunctions = Object.entries(gasMap).sort((a, b) => b[1] - a[1]);
    const [worstFn, worstGas] = topFunctions[0];

    core.info(`📊 Parsed ${topFunctions.length} function(s) from gas report`);
    core.info(`   Worst function: ${worstFn} @ ${worstGas.toLocaleString()} gas`);

    // ── Step 3: Fetch live market data ──────────────────────────────────────
    core.startGroup('📡 Fetching live market data');
    const [gasPriceGwei, ethPriceUSD] = await Promise.all([
      fetchGasPrice(etherscanKey),
      fetchETHPrice(),
    ]);
    core.info(`   Gas Price : ${gasPriceGwei} Gwei`);
    core.info(`   ETH Price : $${ethPriceUSD.toLocaleString()}`);
    core.endGroup();

    // ── Step 4: Compute cost per transaction ────────────────────────────────
    const costPerTx = computeCostUSD(worstGas, gasPriceGwei, ethPriceUSD);
    core.info(`💰 Cost per tx (worst-case): $${costPerTx.toFixed(4)}`);

    // ── Step 5: Simulate at scale ────────────────────────────────────────────
    const simulation = simulate(costPerTx);
    core.info(`📈 Monthly cost @ scale: $${simulation.monthlyCost.toFixed(2)}`);

    // ── Step 6: Risk assessment ─────────────────────────────────────────────
    const risk = assessRisk(costPerTx, worstGas);
    core.info(`🔍 Risk: ${risk.riskLevel} | Drop-off: ${(risk.dropRate * 100).toFixed(0)}%`);

    // ── Step 7: Decision ────────────────────────────────────────────────────
    const verdict = decide({ riskLevel: risk.riskLevel, costUSD: costPerTx });
    core.info(`⚖️  Verdict: ${verdict}`);

    // ── Step 8 (optional): AI explanation ───────────────────────────────────
    let aiNote = null;
    if (nvidiaKey) {
      core.startGroup('🤖 Requesting AI analysis (NVIDIA NIM)');
      aiNote = await fetchAIExplanation({
        functionName : worstFn,
        gasUsed      : worstGas,
        costUSD      : costPerTx,
        apiKey       : nvidiaKey,
      });
      if (aiNote) core.info(aiNote);
      core.endGroup();
    }

    // ── Step 9: Format report ───────────────────────────────────────────────
    const report = formatReport({
      costPerTx,
      simulation,
      risk,
      verdict,
      gasData     : { gasPriceGwei, ethPriceUSD },
      topFunctions: topFunctions.slice(0, 10), // Cap at 10 rows
      aiNote,
    });

    core.info('\n' + report);

    // ── Step 10: Post (or update) the PR comment ─────────────────────────────
    await upsertPRComment(githubToken, report);

    // ── Step 11: Set outputs ─────────────────────────────────────────────────
    core.setOutput('verdict',     verdict);
    core.setOutput('cost_per_tx', costPerTx.toFixed(4));

    // ── Step 12: Fail CI if verdict is DO NOT DEPLOY ─────────────────────────
    if (verdict === VERDICTS.DO_NOT_DEPLOY) {
      core.setFailed(
        `❌ ETHRALENS: Contract is NOT economically viable.\n` +
        `   Cost per tx: $${costPerTx.toFixed(4)} | Drop-off: ${(risk.dropRate * 100).toFixed(0)}%\n` +
        `   Fix gas usage in \`${worstFn}\` before deploying.`
      );
    } else if (verdict === VERDICTS.OPTIMIZE) {
      core.warning(
        `⚠️  ETHRALENS: Contract needs optimization.\n` +
        `   Cost per tx: $${costPerTx.toFixed(4)} — target below $3.00.`
      );
    } else {
      core.info(`✅ ETHRALENS: Contract is economically SAFE. Cost per tx: $${costPerTx.toFixed(4)}`);
    }

  } catch (err) {
    core.setFailed(`ETHRALENS failed unexpectedly: ${err.message}`);
  }
}

run();
