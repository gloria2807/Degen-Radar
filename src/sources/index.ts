// Main signal fetching orchestrator

import type { ActorInput, Signals } from '../types/index.js';
import type { SignalValue } from '../types/index.js';
import { CONFIG } from '../config/index.js';
import { fetchAttentionSignal } from './attention.js';
import { fetchHoldersSignal } from './holders.js';
import { fetchLiquiditySignal } from './liquidity.js';
import { fetchMomentumSignal } from './momentum.js';
import { fetchWalletFlowSignal } from './walletFlow.js';

/**
 * Fetches all signals for a token
 */
export async function fetchAllSignals(
  tokenAddress: string,
  input: ActorInput
): Promise<Signals> {
  // Fetch all signals concurrently
  const [momentum, liquidity, holders, walletFlow, attention] = await Promise.all([
    fetchMomentumSignal(tokenAddress, 'solana', input.observationWindowHours ?? CONFIG.DEFAULT_OBSERVATION_WINDOW_HOURS),
    fetchLiquiditySignal(tokenAddress, 'solana'),
    fetchHoldersSignal(tokenAddress, 'solana', input.observationWindowHours ?? CONFIG.DEFAULT_OBSERVATION_WINDOW_HOURS),
    fetchWalletFlowSignal(tokenAddress, input.trackedWalletAddresses ?? [], 'solana'),
    fetchAttentionSignal(
      tokenAddress,
      undefined, // Token symbol will be fetched from CoinGecko internally if needed
      input.observationWindowHours ?? CONFIG.DEFAULT_OBSERVATION_WINDOW_HOURS
    )
  ]);

  return {
    momentum,
    liquidity,
    holders,
    walletFlow,
    attention
  };
}