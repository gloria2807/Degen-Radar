// Wallet flow signal collector - tracks token movement in tracked wallets

import { CONFIG } from '../config/index.js';
import type { SignalValue } from '../types/index.js';
import { httpPost } from '../utils/http.js';

interface SignatureInfo {
    signature: string;
    blockTime: number | null;
    err: unknown;
}

interface TokenBalance {
    accountIndex: number;
    mint: string;
    owner?: string;
    uiTokenAmount: {
        uiAmount: number | null;
        decimals: number;
        amount: string;
    };
}

interface SolanaTransaction {
    blockTime: number | null;
    meta?: {
        err: unknown;
        preTokenBalances?: TokenBalance[];
        postTokenBalances?: TokenBalance[];
    } | null;
}

const MAX_SIGNATURES_PER_WALLET = 100;
const MAX_TRANSACTION_REQUESTS = 60;
const CONCURRENCY_LIMIT = 5;

/**
 * Fetches token flow for tracked wallets.
 *
 * Flow is calculated from the difference between pre-transaction
 * and post-transaction token balances for the tracked wallets.
 *
 * Positive flow = tracked wallets accumulated the token.
 * Negative flow = tracked wallets reduced their holdings.
 */
export async function fetchWalletFlowSignal(
    tokenAddress: string,
    trackedWalletAddresses: string[],
    _chain = 'solana',
    observationWindowHours: number = CONFIG.DEFAULT_OBSERVATION_WINDOW_HOURS,
): Promise<SignalValue> {
    try {
        if (!trackedWalletAddresses || trackedWalletAddresses.length === 0) {
            return {
                value: null,
                timestamp: Date.now(),
                source: 'walletFlow',
                available: false,
                metadata: {
                    error: 'No tracked wallet addresses provided',
                },
            };
        }

        if (!isValidSolanaAddress(tokenAddress)) {
            return {
                value: null,
                timestamp: Date.now(),
                source: 'walletFlow',
                available: false,
                metadata: {
                    error: 'Invalid token address format',
                },
            };
        }

        const validWallets = trackedWalletAddresses.filter(isValidSolanaAddress);

        if (validWallets.length === 0) {
            return {
                value: null,
                timestamp: Date.now(),
                source: 'walletFlow',
                available: false,
                metadata: {
                    error: 'No valid tracked wallet addresses provided',
                },
            };
        }

        const solanaRpcUrl = CONFIG.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

        const cutoffTimestamp = Math.floor(Date.now() / 1000) - observationWindowHours * 60 * 60;

        // ------------------------------------------------------------
        // 1. Get recent transaction signatures for each tracked wallet
        // ------------------------------------------------------------

        const walletSignatures = await Promise.all(
            validWallets.map(async (walletAddress) => {
                const rpcPayload = {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getSignaturesForAddress',
                    params: [
                        walletAddress,
                        {
                            limit: MAX_SIGNATURES_PER_WALLET,
                            commitment: 'confirmed',
                        },
                    ],
                };

                const rpcResult = await httpPost<{
                    result?: {
                        value?: {
                            signature?: string;
                            err?: unknown;
                            blockTime?: number | null;
                        }[];
                    };
                }>(solanaRpcUrl, rpcPayload);

                if (rpcResult.error) {
                    return {
                        walletAddress,
                        signatures: [] as SignatureInfo[],
                        error: rpcResult.error,
                    };
                }

                const signatures: SignatureInfo[] = Array.isArray(rpcResult.data?.result)
                    ? rpcResult.data.result.filter(
                          (item: SignatureInfo) =>
                              item.blockTime !== null && item.blockTime >= cutoffTimestamp && !item.err,
                      )
                    : [];

                return {
                    walletAddress,
                    signatures,
                    error: undefined,
                };
            }),
        );

        const signatureToWallets = new Map<string, Set<string>>();

        const walletErrors: string[] = [];

        for (const wallet of walletSignatures) {
            if (wallet.error) {
                walletErrors.push(`${wallet.walletAddress}: ${wallet.error}`);
            }

            for (const signature of wallet.signatures) {
                if (!signatureToWallets.has(signature.signature)) {
                    signatureToWallets.set(signature.signature, new Set<string>());
                }

                signatureToWallets.get(signature.signature)!.add(wallet.walletAddress);
            }
        }

        let signaturesToProcess = Array.from(signatureToWallets.keys());

        if (signaturesToProcess.length > MAX_TRANSACTION_REQUESTS) {
            signaturesToProcess = signaturesToProcess.slice(0, MAX_TRANSACTION_REQUESTS);
        }

        // ------------------------------------------------------------
        // 2. Fetch transaction details
        // ------------------------------------------------------------

        const transactionResults: {
            signature: string;
            transaction: SolanaTransaction | null;
        }[] = [];

        for (let i = 0; i < signaturesToProcess.length; i += CONCURRENCY_LIMIT) {
            const batch = signaturesToProcess.slice(i, i + CONCURRENCY_LIMIT);

            const batchResults = await Promise.all(
                batch.map(async (signature) => {
                    const rpcPayload = {
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getTransaction',
                        params: [
                            signature,
                            {
                                encoding: 'jsonParsed',
                                commitment: 'confirmed',
                                maxSupportedTransactionVersion: 0,
                            },
                        ],
                    };

                    const rpcResult = await httpPost<{
                        result?: {
                            meta?: {
                                err?: unknown;
                                preTokenBalances?: {
                                    owner?: string;
                                    mint?: string;
                                    uiTokenAmount?: {
                                        amount?: string;
                                        decimals?: number;
                                        uiAmount?: number | null;
                                    };
                                }[];
                                postTokenBalances?: {
                                    owner?: string;
                                    mint?: string;
                                    uiTokenAmount?: {
                                        amount?: string;
                                        decimals?: number;
                                        uiAmount?: number | null;
                                    };
                                }[];
                            } | null;
                            transaction?: {
                                message?: {
                                    accountKeys?: {
                                        pubkey?: string;
                                    }[];
                                };
                            };
                        } | null;
                    }>(solanaRpcUrl, rpcPayload);

                    if (rpcResult.error || !rpcResult.data?.result) {
                        return {
                            signature,
                            transaction: null,
                        };
                    }

                    return {
                        signature,
                        transaction: rpcResult.data.result as SolanaTransaction,
                    };
                }),
            );

            transactionResults.push(...batchResults);
        }

        // ------------------------------------------------------------
        // 3. Calculate token balance changes
        // ------------------------------------------------------------

        const walletFlow = new Map<string, number>();

        for (const wallet of validWallets) {
            walletFlow.set(wallet, 0);
        }

        let totalInflow = 0;
        let totalOutflow = 0;
        let transactionsWithTokenActivity = 0;

        for (const result of transactionResults) {
            const { transaction } = result;

            if (!transaction?.meta) {
                continue;
            }

            const preBalances = transaction.meta.preTokenBalances ?? [];

            const postBalances = transaction.meta.postTokenBalances ?? [];

            const walletsInTransaction = signatureToWallets.get(result.signature);

            if (!walletsInTransaction) {
                continue;
            }

            let transactionHadTokenActivity = false;

            for (const walletAddress of walletsInTransaction) {
                const preBalance = getWalletTokenBalance(preBalances, walletAddress, tokenAddress);

                const postBalance = getWalletTokenBalance(postBalances, walletAddress, tokenAddress);

                const delta = postBalance - preBalance;

                if (delta !== 0) {
                    transactionHadTokenActivity = true;

                    if (delta > 0) {
                        totalInflow += delta;
                    } else {
                        totalOutflow += Math.abs(delta);
                    }

                    walletFlow.set(walletAddress, (walletFlow.get(walletAddress) ?? 0) + delta);
                }
            }

            if (transactionHadTokenActivity) {
                transactionsWithTokenActivity++;
            }
        }

        // ------------------------------------------------------------
        // 4. Get current tracked-wallet holdings
        // ------------------------------------------------------------

        const currentBalances = await Promise.all(
            validWallets.map(async (walletAddress) => {
                const rpcPayload = {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getTokenAccountsByOwner',
                    params: [
                        walletAddress,
                        {
                            mint: tokenAddress,
                        },
                        {
                            encoding: 'jsonParsed',
                        },
                    ],
                };

                const rpcResult = await httpPost<{
                    result?: {
                        value?: {
                            account?: {
                                data?: {
                                    parsed?: {
                                        info?: {
                                            tokenAmount?: {
                                                uiAmount?: number | null;
                                            };
                                        };
                                    };
                                };
                            };
                        }[];
                    };
                }>(solanaRpcUrl, rpcPayload);

                if (rpcResult.error || !rpcResult.data?.result?.value) {
                    return {
                        walletAddress,
                        balance: 0,
                    };
                }

                let balance = 0;

                for (const account of rpcResult.data.result.value) {
                    const amount = account.account?.data?.parsed?.info?.tokenAmount?.uiAmount;

                    if (typeof amount === 'number') {
                        balance += amount;
                    }
                }

                return {
                    walletAddress,
                    balance,
                };
            }),
        );

        const totalCurrentBalance = currentBalances.reduce((total, wallet) => total + wallet.balance, 0);

        const totalNetFlow = Array.from(walletFlow.values()).reduce((total, flow) => total + flow, 0);

        const roundedNetFlow = Number(totalNetFlow.toFixed(6));
        const roundedInflow = Number(totalInflow.toFixed(6));
        const roundedOutflow = Number(totalOutflow.toFixed(6));
        const flowRatio = totalCurrentBalance > 0 ? roundedNetFlow / totalCurrentBalance : 0;

        const roundedFlowRatio = Number(flowRatio.toFixed(6));

        // ------------------------------------------------------------
        // 5. Calculate flow ratio
        // ------------------------------------------------------------

        if (totalCurrentBalance === 0 && totalNetFlow === 0) {
            return {
                value: 0,
                timestamp: Date.now(),
                source: 'solana-rpc',
                available: transactionResults.length > 0,
                metadata: {
                    trackedWalletsCount: validWallets.length,
                    transactionsAnalyzed: transactionResults.length,
                    transactionsWithTokenActivity,
                    totalCurrentBalance: 0,
                    totalInflow: roundedInflow,
                    totalOutflow: roundedOutflow,
                    totalNetFlow: roundedNetFlow,
                    flowRatio: roundedFlowRatio,
                    observationWindowHours,
                    walletErrors: walletErrors.length > 0 ? walletErrors : undefined,
                    note: 'No tracked-wallet token flow detected during the observation window.',
                },
            };
        }

        const walletBalances: Record<string, number> = {};

        for (const wallet of currentBalances) {
            walletBalances[wallet.walletAddress] = wallet.balance;
        }

        return {
            value: flowRatio,
            timestamp: Date.now(),
            source: 'solana-rpc',
            available: transactionResults.length > 0,
            metadata: {
                trackedWalletsCount: validWallets.length,
                transactionsAnalyzed: transactionResults.length,
                transactionsWithTokenActivity,
                totalCurrentBalance,
                totalInflow: Number(totalInflow.toFixed(6)),
                totalOutflow: Number(totalOutflow.toFixed(6)),
                totalNetFlow: Number(totalNetFlow.toFixed(6)),
                flowRatio,
                walletBalances,
                walletNetFlows: Object.fromEntries(
                    Array.from(walletFlow.entries()).map(([walletAddress, flow]) => [
                        walletAddress,
                        Number(flow.toFixed(6)),
                    ]),
                ),
                observationWindowHours,
                walletErrors: walletErrors.length > 0 ? walletErrors : undefined,
                note: 'Net token flow calculated from pre/post transaction balances for tracked wallets.',
            },
        };
    } catch (error) {
        return {
            value: null,
            timestamp: Date.now(),
            source: 'solana-rpc',
            available: false,
            metadata: {
                error: error instanceof Error ? error.message : String(error),
            },
        };
    }
}

/**
 * Gets the balance of a specific token for a specific wallet
 * from Solana's pre/post token balance arrays.
 */
function getWalletTokenBalance(balances: TokenBalance[], walletAddress: string, tokenAddress: string): number {
    let balance = 0;

    for (const entry of balances) {
        if (entry.mint.toLowerCase() !== tokenAddress.toLowerCase()) {
            continue;
        }

        if (entry.owner?.toLowerCase() !== walletAddress.toLowerCase()) {
            continue;
        }

        const amount = entry.uiTokenAmount.uiAmount;

        if (typeof amount === 'number') {
            balance += amount;
        }
    }

    return balance;
}

function isValidSolanaAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
        return false;
    }

    if (address.length < 32 || address.length > 44) {
        return false;
    }

    return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}
