"use client";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { useState, useRef } from "react";
import Spinner from "./Spinner/Spinner";
import { createTokenWithMetadata } from "../utils/createToken";
import { UploadClient } from "@uploadcare/upload-client";

export function TokenLaunchpad() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [initialSupply, setInitialSupply] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [decimals, setDecimals] = useState<number>(9);

  // Use ref to reset the file input field
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file input changes
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files ? e.target.files[0] : null;
    setImageFile(file);
  }

  async function handleCreateToken(): Promise<void> {
    console.log("entered handleCreateToken");
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error("Wallet not connected");
      return;
    }

    if (!imageFile) {
      toast.error("Please upload an image.");
      return;
    }

    setLoading(true);
    try {
      // Upload image to Uploadcare
      const client = new UploadClient({ publicKey: "00da7a5b4165cddb5025" });
      const result = await client.uploadFile(imageFile);

      if (!result.cdnUrl) {
        toast.error("Failed to upload image to storage.");
        setLoading(false);
        return;
      }

      // Call the helper function to create the token with metadata
      const data = createTokenWithMetadata(
        wallet,
        connection,
        tokenName,
        tokenSymbol,
        result.cdnUrl,
        initialSupply,
        decimals
      );
      toast.promise(
        data, // This is your promise
        {
          loading: "Creating token...",
          success: (data) => {
            // Reset the form fields
            setTokenName("");
            setTokenSymbol("");
            setImageFile(null);
            setInitialSupply("");

            // Clear the file input field using the ref
            if (fileInputRef.current) {
              fileInputRef.current.value = ""; // Reset the file input
            }
            if(data)
            // Return a message to display in the toast
            return <p>Token created successfully!<br/> Mint: {data[0]} <br/> Transfer: {data[1]}</p>;
          },
          error: "An error occurred during token creation.",
        }
      );
    } catch (error) {
      toast.error("An error occurred during token creation.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-6 text-indigo-600">
        Solana Token Launchpad
      </h1>
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 space-y-4">
        <input
          className="text-black w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          type="text"
          placeholder="Token Name"
          value={tokenName}
          onChange={(e) => setTokenName(e.target.value)}
        />
        <input
          className="text-black w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          type="text"
          placeholder="Token Symbol"
          value={tokenSymbol}
          onChange={(e) => setTokenSymbol(e.target.value)}
        />
        <input
          className="text-black w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          ref={fileInputRef}
        />

        <input
          className="text-black w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          type="text"
          placeholder="Initial Supply"
          value={initialSupply}
          onChange={(e) => setInitialSupply(e.target.value)}
        />
        <input
          className="text-black w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          type="text"
          placeholder="Decimals"
          value={decimals}
          onChange={(e) => setDecimals(Number(e.target.value))}
        />

        <button
          onClick={handleCreateToken}
          className="btn w-full bg-indigo-600 text-white py-3 rounded hover:bg-indigo-700 transition-shadow shadow-lg hover:shadow-xl"
          disabled={loading}
        >
          {loading ? <Spinner size={25} color="#fff" /> : "Create Token"}
        </button>
      </div>
    </div>
  );
}
