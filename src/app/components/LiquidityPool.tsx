"use client";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { createPool } from "../utils/createPool";
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import Spinner from "./Spinner/Spinner";


const connection = new Connection("https://api.devnet.solana.com");

const CreateLiquidityPoolForm = () => {
  const [baseToken, setBaseToken] = useState("");
  const [baseTokenAmount, setBaseTokenAmount] = useState("");
  const [quoteToken, setQuoteToken] = useState("");
  const [quoteTokenAmount, setQuoteTokenAmount] = useState("");
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const wallet = useWallet();

  useEffect(() => {
    const fetchTokens = async () => {
      if (!wallet.publicKey) {
        toast.error("Wallet not connected");
        return;
      }

      try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          wallet.publicKey,
          { programId: TOKEN_2022_PROGRAM_ID }
        );

        console.log("Token accounts:", tokenAccounts);

        const mintAddresses = tokenAccounts.value
          .filter(
            ({ account }) => account.data.parsed.info.tokenAmount.decimals !== 0
          )
          .map(({ account }) => new PublicKey(account.data.parsed.info.mint));

        if (!mintAddresses) {
          toast.error("No Tokens found in your wallet");
        }
        console.log("Mint addresses:", mintAddresses);
        // const data = await fetchMultipleTokenMetadata(mintAddresses, connection);
        setTokens(mintAddresses);
      } catch (error) {
        console.error("Error fetching tokens:", error);
        toast.error("Failed to fetch tokens");
      }
    };
    if (wallet.publicKey) fetchTokens();
  }, [wallet.publicKey]);

  // Utility function to round the amount to a maximum of 3 decimal places
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

    // Round the amounts to 3 decimals before passing to createPool
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
        toast.info(`Pool ID: ${data.poolKeys.poolId}`);
        toast.info(`Transaction sig: ${data.txId}`);

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
            <option value="" disabled>
              Select a base token
            </option>
            <option value="So11111111111111111111111111111111111111112">
              Solana (SOL)
            </option>{" "}
            {/* Wrapped SOL mint address */}
            {tokens.map((token) => (
              <option key={token} value={token}>
                {token.toBase58()}
              </option>
            ))}
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
            <option value="" disabled>
              Select a quote token
            </option>
            <option value="SOL">Solana (SOL)</option>{" "}
            {/* Add SOL as an option */}
            {tokens.map((token) => (
              <option key={token} value={token}>
                {token.toBase58()}
              </option>
            ))}
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

        <button
          type="submit"
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition duration-300"
        >
          {loading ? <Spinner size={25} color="#fff" /> : "Create Liquidity Pool"}
        </button>
      </form>
    </div>
  );
};

export default CreateLiquidityPoolForm;
