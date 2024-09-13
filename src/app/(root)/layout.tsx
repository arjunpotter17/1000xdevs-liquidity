"use client";
import { Inter } from "next/font/google";
import "../globals.css";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";
import { Toaster } from "sonner";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";



const inter = Inter({ subsets: ["latin"] });



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
     
  return (
    <html lang="en">
      <body className={inter.className}>
      <div style={{width: "100vw"}}>
      <ConnectionProvider endpoint={"https://api.devnet.solana.com"}>
        <WalletProvider wallets={[]} autoConnect>
            <WalletModalProvider>
            <Toaster richColors expand visibleToasts={6}/>
            <Navbar/>
              {children}
            </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
      </body>
    </html>
  );
}
