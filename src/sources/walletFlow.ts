// Wallet flow signal collector - tracks current token holdings in tracked wallets

import { httpPost } from '../utils/http.js';
import { SignalValue } from '../types/index.js';
import { CONFIG } from '../config/index.js';

/**
 * Fetches wallet holdings data for tracked wallets
 * Uses public Solana RPC to get current token balances in associated token accounts
 * NOTE: This shows current holdings, not flow/change over time. For true flow analysis,
 * historical balance data would be needed.
 */
export async function fetchWalletFlowSignal(
  tokenAddress: string,
  trackedWalletAddresses: string[],
  _chain: string = 'solana'
): Promise<SignalValue> {
  try {
    // If no tracked wallets specified, we can't calculate holdings
    if (!trackedWalletAddresses || trackedWalletAddresses.length === 0) {
      return {
        value: null,
        timestamp: Date.now(),
        source: 'walletFlow',
        available: false,
        metadata: { error: 'No tracked wallet addresses provided' }
      };
    }

    // Validate token address format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenAddress)) {
      return {
        value: null,
        timestamp: Date.now(),
        source: 'walletFlow',
        available: false,
        metadata: { error: 'Invalid token address format' }
      };
    }

    // Use public Solana RPC endpoint (no key required for basic reads)
    const solanaRpcUrl = CONFIG.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

    // For each tracked wallet, get its token account balance for this token
    let totalBalance = 0;
    let walletsWithData = 0;
    const walletBalances: Record<string, number> = {};
    const processingErrors: string[] = [];

    // Process wallets in parallel (but limit concurrency to avoid rate limiting)
    const balancePromises = trackedWalletAddresses.map(async (walletAddress) => {
      try {
        // Validate wallet address format (basic Solana address validation)
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
          return { walletAddress, balance: null, error: 'Invalid wallet address format' };
        }

        // Use getTokenAccountsByOwner to get all token accounts for this wallet that hold our token
        const rpcPayload = {
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenAccountsByOwner",
          params: [
            walletAddress,
            { mint: tokenAddress }, // Filter by token mint
            { encoding: "jsonParsed" }
          ]
        };

        const rpcResult = await httpPost<any>(solanaRpcUrl, rpcPayload);

        if (rpcResult.error) {
          return { walletAddress, balance: null, error: rpcResult.error };
        }

        if (!rpcResult.data || !rpcResult.data.result) {
          return { walletAddress, balance: null, error: 'No result from RPC' };
        }

        const accounts = rpcResult.data.result.value;

        if (!accounts || accounts.length === 0) {
          // Wallet has no associated token account for this token (balance is 0)
          return { walletAddress, balance: 0, error: null };
        }

        // Sum balances of all token accounts for this wallet (should typically be just one)
        let walletBalance = 0;
        for (const account of accounts) {
          const tokenAmount = account.account.data.parsed.info.tokenAmount;
          const uiAmount = tokenAmount.uiAmount; // Already formatted with correct decimals
          if (uiAmount !== null) {
            walletBalance += uiAmount;
          }
        }

        return { walletAddress, balance: walletBalance, error: null };
      } catch (error) {
        return { walletAddress, balance: null, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Wait for all balance requests to complete
    const results = await Promise.all(balancePromises);

    // Process results
    for (const result of results) {
      if (!result.error && result.balance !== null) {
        walletBalances[result.walletAddress] = result.balance;
        totalBalance += result.balance;
        walletsWithData++;
      } else if (result.error) {
        processingErrors.push(`${result.walletAddress}: ${result.error}`);
      }
    }

    // If we got data for at least some wallets
    if (walletsWithData > 0) {
      return {
        value: totalBalance,
        timestamp: Date.now(),
        source: 'walletFlow',
        available: true,
        metadata: {
          trackedWalletsCount: trackedWalletAddresses.length,
          walletsWithData: walletsWithData,
          processingErrors: processingErrors.length > 0 ? processingErrors : undefined,
          walletBalances: walletBalances,
          note: 'This is current holder balance, not flow/change over time. For true flow, historical balance data is needed.'
        }
      };
    }

    // If we couldn't get data for any wallets
    return {
      value: null,
      timestamp: Date.now(),
      source: 'walletFlow',
      available: false,
      metadata: { error: 'Failed to fetch wallet balance data from Solana RPC', details: processingErrors }
    };
  } catch (error) {
    return {
      value: null,
      timestamp: Date.now(),
      source: 'walletFlow',
      available: false,
      metadata: {
  error: error instanceof Error ? error.message : String(error),
}
    };
  }
}