// Main signal fetching orchestrator

import type { ActorInput, Signals } from '../types';
import { SignalValue } from '../types';
import { fetchAttentionSignal } from './attention.ts';
import { fetchHoldersSignal } from './holders.ts';
import { fetchLiquiditySignal } from './liquidity.ts';
import { fetchMomentumSignal } from './momentum.ts';
import { fetchWalletFlowSignal } from './walletFlow.ts';

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
      input.attentionSources ?? ['twitter', 'reddit'],
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