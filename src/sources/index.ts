import { CONFIG } from '../config/index.js';
import type { ActorInput, Signals } from '../types/index.js';
import { fetchAttentionSignal } from './attention.js';
import { fetchHoldersSignal } from './holders.js';
import { fetchLiquiditySignal } from './liquidity.js';
import { fetchMomentumSignal } from './momentum.js';
import { fetchWalletFlowSignal } from './walletFlow.js';

export async function fetchAllSignals(
  tokenAddress: string,
  input: ActorInput,
): Promise<Signals> {
  const observationWindowHours =
    input.observationWindowHours ?? CONFIG.DEFAULT_OBSERVATION_WINDOW_HOURS;

  const enabled = new Set(
    input.enabledSignalCategories ?? [
      'momentum',
      'liquidity',
      'holders',
      'walletFlow',
      'attention',
    ],
  );

  const unavailable = (source: string) => ({
    value: null,
    timestamp: Date.now(),
    source,
    available: false,
  });

  const [momentum, liquidity, holders, walletFlow, attention] =
    await Promise.all([
      enabled.has('momentum')
        ? fetchMomentumSignal(
            tokenAddress,
            'solana',
            observationWindowHours,
          )
        : Promise.resolve(unavailable('disabled')),

      enabled.has('liquidity')
        ? fetchLiquiditySignal(tokenAddress, 'solana')
        : Promise.resolve(unavailable('disabled')),

      enabled.has('holders')
        ? fetchHoldersSignal(
            tokenAddress,
            'solana',
            observationWindowHours,
          )
        : Promise.resolve(unavailable('disabled')),

      enabled.has('walletFlow')
        ? fetchWalletFlowSignal(
            tokenAddress,
            input.trackedWalletAddresses ?? [],
            'solana',
            observationWindowHours,
          )
        : Promise.resolve(unavailable('disabled')),

      enabled.has('attention')
        ? fetchAttentionSignal(
            tokenAddress,
            undefined,
            observationWindowHours,
          )
        : Promise.resolve(unavailable('disabled')),
    ]);

  return {
    momentum,
    liquidity,
    holders,
    walletFlow,
    attention,
  };
}