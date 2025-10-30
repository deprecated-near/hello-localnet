import { NearConnector } from "@hot-labs/near-connect";
import { useEffect, useState } from "react";
import { JsonRpcProvider } from "@near-js/providers";

let connector;
const provider = new JsonRpcProvider({ url: process.env.NEXT_PUBLIC_RPC_URL });

if (typeof window !== "undefined") {
  connector = new NearConnector({ network: "testnet" });
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
      const accountId = await payload.wallet.getAddress();
      setSignedAccountId(accountId);
    }

    connector.on("wallet:signOut", onSignOut);
    connector.on("wallet:signIn", onSignIn);

    reload();
    return () => {
      connector.off("wallet:signOut", onSignOut);
      connector.off("wallet:signIn", onSignIn);
    };
  }, [connector]);

  async function signIn() {
    const wallet = await connector.connect();
    console.log("Connected wallet", wallet);
  }

  async function signOut() {
    await connector.disconnect(wallet);
    console.log("Disonnected wallet");
  }

  async function viewFunction({ contractId, method, args = {} }) {
    return provider.callFunction(contractId, method, args, {
      finality: 'optimistic'
    });
  }

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
