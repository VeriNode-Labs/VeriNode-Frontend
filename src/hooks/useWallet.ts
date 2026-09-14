"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAddress, getNetwork, isConnected } from "@stellar/freighter-api";
import { shortenAddress } from "@/services/crypto";

export const EXPECTED_NETWORK = {
  name: process.env.NEXT_PUBLIC_NETWORK_NAME ?? "TESTNET",
  passphrase: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
};

export type WalletStatus = "checking" | "disconnected" | "connected";

export interface WalletState {
  address: string | null;
  shortAddress: string;
  status: WalletStatus;
  installed: boolean;
  loading: boolean;
  network: { network: string; networkPassphrase: string } | null;
  networkMatches: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  walletNetworkPassphrase: string;
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>("checking");
  const [installed, setInstalled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [network, setNetwork] = useState<{ network: string; networkPassphrase: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const conn = await isConnected();
        if (cancelled) return;
        setInstalled(Boolean(conn.isConnected));

        const popup = await getAddress();
        if (cancelled) return;
        if (!popup.address || popup.error) {
          setAddress(null);
          setStatus("disconnected");
          return;
        }
        setAddress(popup.address);
        setStatus("connected");
        const net = await getNetwork();
        if (cancelled) return;
        if (net.network) {
          setNetwork({ network: net.network, networkPassphrase: net.networkPassphrase });
        }
      } catch (err) {
        if (cancelled) return;
        setInstalled(false);
        setStatus("disconnected");
        setError(err instanceof Error ? err.message : "Freighter unavailable");
      }
    };
    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const conn = await isConnected();
      setInstalled(Boolean(conn.isConnected));
      const popup = await getAddress();
      if (popup.error || !popup.address) {
        throw new Error(popup.error?.message ?? "Could not read wallet address");
      }
      setAddress(popup.address);
      setStatus("connected");
      const net = await getNetwork();
      setNetwork(net.network ? { network: net.network, networkPassphrase: net.networkPassphrase } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Freighter connection failed");
      setStatus("disconnected");
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setAddress(null);
    setNetwork(null);
    setStatus("disconnected");
    setError(null);
  }, []);

  return useMemo(
    () => ({
      address,
      shortAddress: shortenAddress(address ?? "", 5),
      status,
      installed,
      loading,
      network,
      networkMatches: network ? network.networkPassphrase === EXPECTED_NETWORK.passphrase : false,
      error,
      connect,
      disconnect,
      walletNetworkPassphrase:
        network?.networkPassphrase ?? EXPECTED_NETWORK.passphrase,
    }),
    [address, status, installed, loading, network, error, connect, disconnect],
  );
}