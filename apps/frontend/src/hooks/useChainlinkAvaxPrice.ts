import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const FUJI_RPC = 'https://api.avax-test.network/ext/bc/C/rpc';
/** Chainlink AVAX/USD Price Feed on Avalanche Fuji testnet */
const FUJI_AVAX_USD_FEED = '0x5498BB86BC934c8D34FDA08E81D444153d0D06aD';

const PRICE_FEED_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
];

/**
 * Reads the current AVAX/USD price from Chainlink (Fuji) without sending any transaction.
 * Uses public RPC; no wallet or write operations.
 */
export function useChainlinkAvaxPrice(refreshIntervalMs = 30_000) {
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPrice = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(FUJI_RPC);
        const feed = new ethers.Contract(FUJI_AVAX_USD_FEED, PRICE_FEED_ABI, provider);
        const data = await feed.latestRoundData();
        const answer = data[1] as bigint;
        if (cancelled) return;
        // Chainlink uses 8 decimals for USD
        setPriceUsd(answer >= 0n ? Number(answer) / 1e8 : 0);
        setError(null);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to fetch price');
        setPriceUsd(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, refreshIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshIntervalMs]);

  return { priceUsd, error, loading };
}
