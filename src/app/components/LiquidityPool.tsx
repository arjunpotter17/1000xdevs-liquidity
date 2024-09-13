"use client";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createPool } from "../utils/createPool";
import {
  getAccount,
  getMint,
  getTokenMetadata,
  TOKEN_2022_PROGRAM_ID,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import Spinner from "./Spinner/Spinner";

interface Token {
  name: string;
  symbol: string;
  address: string;
  image: any;
}
[];

const CreateLiquidityPoolForm = () => {
  const [baseToken, setBaseToken] = useState("");
  const [baseTokenAmount, setBaseTokenAmount] = useState("");
  const [quoteToken, setQuoteToken] = useState("");
  const [quoteTokenAmount, setQuoteTokenAmount] = useState("");
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokensLoading, setTokensLoading] = useState(true);

  const wallet = useWallet();
  const { connection } = useConnection();

  useEffect(() => {
    const fetchTokens = async () => {
      if (!wallet.publicKey) {
        toast.error("Wallet not connected");
        return;
      }

      setTokensLoading(true); // Set loading state for tokens

      try {
        const tokenAccounts = await connection.getTokenAccountsByOwner(
          wallet?.publicKey,
          { programId: TOKEN_2022_PROGRAM_ID }
        );
        const fetchedTokens = await Promise.all(
          tokenAccounts.value.map(async ({ pubkey }) => {
            try {
              const accountInfo = await getAccount(
                connection,
                pubkey,
                undefined,
                TOKEN_2022_PROGRAM_ID
              );
              const mintInfo = await getMint(
                connection,
                accountInfo.mint,
                undefined,
                TOKEN_2022_PROGRAM_ID
              );

              if (!wallet.publicKey) {
                toast.error("Wallet not connected");
                return null;
              }
              if (mintInfo.mintAuthority?.equals(wallet?.publicKey)) {
                const metadata = await getTokenMetadata(
                  connection,
                  accountInfo.mint
                );
                if (metadata) {
                  let image;
                  if (metadata.uri) {
                    try {
                      const metadataJson = await fetch(
                        `/api/fetchMetadata?url=${metadata.uri}`
                      ).then((res) => res.json());
                      image = metadataJson.image;
                    } catch (error) {
                      console.error("Error fetching metadata JSON:", error);
                      return {
                        name: "unkown Token",
                        symbol: "unkown",
                        address: accountInfo.mint.toBase58(),
                        image: null,
                      };
                    }
                  }
                  return {
                    name: metadata.name,
                    symbol: metadata.symbol,
                    address: accountInfo.mint.toBase58(),
                    image: image,
                  };
                }
              }
            } catch (error) {
              if (!(error instanceof TokenAccountNotFoundError)) {
                console.error("Error fetching token info:", error);
              }
            }
            return null;
          })
        );
        const validTokens = fetchedTokens.filter(
          (token) => token !== null
        ) as Token[];
        setTokens(validTokens);
      } catch (error) {
        console.error("Error fetching tokens:", error);
        toast.error("Failed to fetch tokens");
        return null;
      } finally {
        setTokensLoading(false);
      }
    };
    if (wallet.publicKey) fetchTokens();
  }, [wallet.publicKey]);


  const roundToThreeDecimals = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? "" : num.toFixed(3);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!wallet.publicKey) {
      toast.error("Wallet not connected");
      return;
    }

    // Round to 3 decimals before passing to createPool
    const roundedBaseAmount = roundToThreeDecimals(baseTokenAmount);
    const roundedQuoteAmount = roundToThreeDecimals(quoteTokenAmount);

    if (!roundedBaseAmount || !roundedQuoteAmount) {
      toast.error("Invalid token amounts");
      return;
    }

    try {
      setLoading(true);
      const data = await createPool(
        wallet,
        baseToken, // mint1 (Base token)
        quoteToken, // mint2 (Quote token)
        Number(roundedBaseAmount), // mint1Amount
        Number(roundedQuoteAmount) // mint2Amount
      );
      if (data) {
        const id = data.poolKeys.poolId.toString();
        toast.success(`Pool created successfully!`);

        toast(`Pool ID: ${id}`, {
          action: {
            label: "Close",
            onClick: () => console.log("toast closed!"),
            
          },
          duration: Infinity,
        });

        toast(`Transaction sig: ${data.txId}`, {
          action: {
            label: "Close",
            onClick: () => console.log("toast closed!"),
          },
          duration: Infinity
        });

        // Clear form fields
        setBaseToken("");
        setBaseTokenAmount("");
        setQuoteToken("");
        setQuoteTokenAmount("");
      } else {
        toast.error(`Failed to create pool`);
      }
    } catch (error) {
      console.error("Error creating pool:", error);
      toast.error("Failed to create pool");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 shadow-lg rounded-lg max-w-lg w-full space-y-6"
      >
        <h2 className="text-2xl font-bold text-gray-900 text-center">
          Create Liquidity Pool
        </h2>

        <div>
          <label
            htmlFor="baseToken"
            className="block text-sm font-medium text-gray-700"
          >
            Base Token
          </label>
          <select
            id="baseToken"
            value={baseToken}
            onChange={(e) => setBaseToken(e.target.value)}
            className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {tokensLoading ? (
              <option value="" disabled>
                Loading tokens...
              </option>
            ) : (
              <>
                <option value="" disabled>
                  Select a base token
                </option>
                <option value="So11111111111111111111111111111111111111112">
                  Solana (SOL)
                </option>{" "}
                {/* Wrapped SOL mint address */}
                {tokens?.map((token) => (
                  <option key={token?.address} value={token?.address}>
                    {token?.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="baseTokenAmount"
            className="block text-sm font-medium text-gray-700"
          >
            Base Token Amount
          </label>
          <input
            type="text"
            id="baseTokenAmount"
            value={baseTokenAmount}
            onChange={(e) => setBaseTokenAmount(e.target.value)}
            className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter base token amount"
            required
          />
        </div>

        <div>
          <label
            htmlFor="quoteToken"
            className="block text-sm font-medium text-gray-700"
          >
            Quote Token
          </label>
          <select
            id="quoteToken"
            value={quoteToken}
            onChange={(e) => setQuoteToken(e.target.value)}
            className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {tokensLoading ? (
              <option value="" disabled>
                Loading tokens...
              </option>
            ) : (
              <>
                <option value="" disabled>
                  Select a quote token
                </option>
                <option value="SOL">Solana (SOL)</option>{" "}
                {tokens?.map((token) => (
                  <option key={token?.address} value={token?.address}>
                    {token?.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="quoteTokenAmount"
            className="block text-sm font-medium text-gray-700"
          >
            Quote Token Amount
          </label>
          <input
            type="text"
            id="quoteTokenAmount"
            value={quoteTokenAmount}
            onChange={(e) => setQuoteTokenAmount(e.target.value)}
            className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter quote token amount"
            required
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? <Spinner size={25} color="#fff"/> : "Create Pool"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateLiquidityPoolForm;
