"use client";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_2022_PROGRAM_ID, createMintToInstruction, createAssociatedTokenAccountInstruction, getMintLen, createInitializeMetadataPointerInstruction, createInitializeMintInstruction, TYPE_SIZE, LENGTH_SIZE, ExtensionType, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';
import { toast } from "sonner";
import { useState } from "react";
import Spinner from "./Spinner/Spinner";

export function TokenLaunchpad() {
    const { connection } = useConnection();
    const wallet = useWallet();

    const [tokenName, setTokenName] = useState("");
    const [tokenSymbol, setTokenSymbol] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [initialSupply, setInitialSupply] = useState("");
    const [loading, setLoading] = useState(false);

    async function createToken(): Promise<void> {
        if (!wallet.publicKey) {
            toast.error("Wallet not connected");
            return;
        }

        const mintKeypair = Keypair.generate();
        const metadata = {
            mint: mintKeypair.publicKey,
            name: tokenName || 'KIRA',
            symbol: tokenSymbol || 'KIR',
            uri: imageUrl || 'https://cdn.100xdevs.com/metadata.json',
            additionalMetadata: [],
        };

        try {
            setLoading(true);
            const mintLen = getMintLen([ExtensionType.MetadataPointer]);
            const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

            const transaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: mintLen,
                    lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                createInitializeMetadataPointerInstruction(mintKeypair.publicKey, wallet.publicKey, mintKeypair.publicKey, TOKEN_2022_PROGRAM_ID),
                createInitializeMintInstruction(mintKeypair.publicKey, 9, wallet.publicKey, null, TOKEN_2022_PROGRAM_ID),
                createInitializeInstruction({
                    programId: TOKEN_2022_PROGRAM_ID,
                    mint: mintKeypair.publicKey,
                    metadata: mintKeypair.publicKey,
                    name: metadata.name,
                    symbol: metadata.symbol,
                    uri: metadata.uri,
                    mintAuthority: wallet.publicKey,
                    updateAuthority: wallet.publicKey,
                })
            );

            transaction.feePayer = wallet.publicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            transaction.partialSign(mintKeypair);

            await wallet.sendTransaction(transaction, connection);
            toast.success(`Token mint created at ${mintKeypair.publicKey.toBase58()}`);

            const associatedToken = getAssociatedTokenAddressSync(
                mintKeypair.publicKey,
                wallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
            );

            const transaction2 = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    associatedToken,
                    wallet.publicKey,
                    mintKeypair.publicKey,
                    TOKEN_2022_PROGRAM_ID,
                )
            );

            await wallet.sendTransaction(transaction2, connection);
            toast.success(`Associated token account created at ${associatedToken.toBase58()}`);
            const transaction3 = new Transaction().add(
                createMintToInstruction(mintKeypair.publicKey, associatedToken, wallet.publicKey, Number(initialSupply)*10**9, [], TOKEN_2022_PROGRAM_ID)
            );

            await wallet.sendTransaction(transaction3, connection);

            toast.success("Tokens Minted Successfully!");

            // Clear the form after successful token creation
            setTokenName("");
            setTokenSymbol("");
            setImageUrl("");
            setInitialSupply("");
        } catch (error) {
            toast.error("An error occurred during token creation.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="h-screen flex flex-col justify-center items-center bg-gray-100 p-4">
            <h1 className="text-3xl font-bold mb-6 text-indigo-600">Solana Token Launchpad</h1>
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 space-y-4">
                <input
                    className="inputText w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    type="text"
                    placeholder="Token Name"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                />
                <input
                    className="inputText w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    type="text"
                    placeholder="Token Symbol"
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value)}
                />
                <input
                    className="inputText w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    type="text"
                    placeholder="Image URL"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                />
                <input
                    className="inputText w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    type="text"
                    placeholder="Initial Supply"
                    value={initialSupply}
                    onChange={(e) => setInitialSupply(e.target.value)}
                />
                <button
                    onClick={createToken}
                    className="btn w-full bg-indigo-600 text-white py-3 rounded hover:bg-indigo-700 transition-shadow shadow-lg hover:shadow-xl"
                >
                    {loading ? <Spinner size={25} color="#fff"/> : "Create Token"}
                </button>
            </div>
        </div>
    );
}
