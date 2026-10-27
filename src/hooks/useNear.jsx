import { NearConnector } from "@hot-labs/near-connect";
import { useCallback, useEffect, useState } from "react";
import { JsonRpcProvider } from "near-api-js";

let connector;
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:3030";
const provider = new JsonRpcProvider({ url: rpcUrl });

if (typeof window !== "undefined") {
  connector = new NearConnector({
    // NearConnector exposes mainnet/testnet slots. Point its testnet provider at
    // the same local node configured in the wallet's custom-network settings.
    network: "testnet",
    providers: { testnet: [rpcUrl] },
  });
}

export function useNear() {
  const [wallet, setWallet] = useState(undefined);
  const [signedAccountId, setSignedAccountId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function reload() {
      try {
        const { wallet, accounts } = await connector.getConnectedWallet();
        setWallet(wallet);
        setSignedAccountId(accounts[0].accountId);
      } catch {
        setWallet(undefined);
        setSignedAccountId("");
      } finally {
        setLoading(false);
      }
    }

    async function onSignOut() {
      setWallet(undefined);
      setSignedAccountId("");
    }

    async function onSignIn(payload) {
      console.log("Signed in with payload", payload);
      setWallet(payload.wallet);
      setSignedAccountId(payload.accounts[0]?.accountId ?? "");
    }

    connector.on("wallet:signOut", onSignOut);
    connector.on("wallet:signIn", onSignIn);

    reload();
    return () => {
      connector.off("wallet:signOut", onSignOut);
      connector.off("wallet:signIn", onSignIn);
    };
  }, []);

  const signIn = useCallback(async () => {
    const wallet = await connector.connect();
    console.log("Connected wallet", wallet);
  }, []);

  const signOut = useCallback(async () => {
    await connector.disconnect(wallet);
    console.log("Disconnected wallet");
  }, [wallet]);

  const viewFunction = useCallback(async ({ contractId, method, args = {} }) => {
    return provider.callFunction({ contractId, method, args, blockQuery: { finality: 'optimistic' } });
  }, []);

  async function callFunction({
    contractId,
    method,
    args = {},
    gas = "30000000000000",
    deposit = "0",
  }) {
    return wallet.signAndSendTransaction({
      receiverId: contractId,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: method,
            args,
            gas,
            deposit,
          },
        },
      ],
    });
  }

  return {
    signedAccountId,
    wallet,
    signIn,
    signOut,
    loading,
    viewFunction,
    callFunction,
    provider,
  };
}
