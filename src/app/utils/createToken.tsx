// import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
// import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
// import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
// import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { WalletContextState } from "@solana/wallet-adapter-react";
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { createInitializeInstruction, pack } from "@solana/spl-token-metadata";
import {
  TOKEN_2022_PROGRAM_ID,
  getMintLen,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  TYPE_SIZE,
  LENGTH_SIZE,
  ExtensionType,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import { toast } from "sonner";
import { UploadClient } from "@uploadcare/upload-client";

async function createTokenWithMetadata(
  wallet: WalletContextState,
  connection: Connection,
  tokenName: string,
  tokenSymbol: string,
  imageLink: string,
  initialSupply: string,
  decimals: number
): Promise<null | string[]> {
  console.log(
    "Creating token with metadata...",
    tokenName,
    tokenSymbol,
    imageLink
  );
  try {
    if (!wallet.publicKey || !wallet.signAllTransactions) {
      toast.error("Wallet not connected");
      return null;
    }

    const client = new UploadClient({ publicKey: "00da7a5b4165cddb5025" });
    const metadataUri = JSON.stringify({
      tokenName,
      tokenSymbol,
      image: imageLink,
    });

    const metadataFile = new File([metadataUri], "metadata.json", {
      type: "application/json",
    });

    const result = await client.uploadFile(metadataFile);

    if (!result.cdnUrl) {
      toast.error("Failed to generate metadata URL");
      return null;
    }

    const mint = Keypair.generate();

    const metadata = {
      mint: mint.publicKey,
      name: tokenName,
      symbol: tokenSymbol,
      uri: result.cdnUrl,
      additionalMetadata: [],
    };

    const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
    const metadataLen = pack(metadata).length;
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const lamports = await connection.getMinimumBalanceForRentExemption(
      mintLen + metadataExtension + metadataLen
    );

    const createTransaction = new Transaction();

    createTransaction.add(
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mint.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeMetadataPointerInstruction(
        mint.publicKey,
        wallet.publicKey,
        mint.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeMintInstruction(
        mint.publicKey,
        decimals,
        wallet.publicKey,
        mint.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mint.publicKey,
        updateAuthority: wallet.publicKey,
        mint: mint.publicKey,
        mintAuthority: wallet.publicKey,
        name: tokenName,
        symbol: tokenSymbol,
        uri: result.cdnUrl,
      })
    );

    createTransaction.feePayer = wallet.publicKey;

    const associatedToken = getAssociatedTokenAddressSync(
      mint.publicKey,
      wallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const ataTransaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        associatedToken,
        wallet.publicKey,
        mint.publicKey,
        TOKEN_2022_PROGRAM_ID
      )
    );

    const mintTransaction = new Transaction().add(
      createMintToInstruction(
        mint.publicKey,
        associatedToken,
        wallet.publicKey,
        Number(initialSupply),
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    const blockhash = (await connection.getLatestBlockhash()).blockhash;
    createTransaction.recentBlockhash = blockhash;
    ataTransaction.recentBlockhash = blockhash;
    mintTransaction.recentBlockhash = blockhash;

    createTransaction.feePayer = wallet.publicKey;
    ataTransaction.feePayer = wallet.publicKey;
    mintTransaction.feePayer = wallet.publicKey;

    createTransaction.partialSign(mint);

    const transactions = await wallet.signAllTransactions([
      createTransaction,
      ataTransaction,
      mintTransaction,
    ]);

    const createTxId = await connection.sendRawTransaction(
      transactions[0].serialize()
    );
    console.log("createTxId", createTxId);
    const err = await connection.confirmTransaction(createTxId);
    console.log("err", err);
    if (err.value.err !== null) {
      toast.error("Failed to create token");
      return null;
    } else {
      toast.success("Mint account created.");
    }

    const ataTxId = await connection.sendRawTransaction(
      transactions[1].serialize()
    );
    console.log("createTxId", ataTxId);
    const ataErr = await connection.confirmTransaction(ataTxId);
    if (ataErr.value.err !== null) {
      toast.error("Failed to create ATA");
      return null;
    } else {
      toast.success("User ATA account created.");
    }

    const mintTxId = await connection.sendRawTransaction(
      transactions[2].serialize()
    );
    console.log("createTxId", mintTxId);
    const mintErr = await connection.confirmTransaction(mintTxId);
    if (mintErr.value.err !== null) {
      toast.error("Failed to mint tokens");
      return null;
    } else {
      toast.success("Tokens transferred to User.");
    }
    return [mint.publicKey.toBase58(), mintTxId];
  } catch (error) {
    console.error(error);
    toast.error("An error occurred during token creation.");
    return null;
  }
}

export { createTokenWithMetadata };
