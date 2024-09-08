"use client";
import { Raydium, TxVersion, parseTokenAccountResp } from '@raydium-io/raydium-sdk-v2'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { WalletContextState } from '@solana/wallet-adapter-react';


export const connection = new Connection(clusterApiUrl('devnet'))
export const txVersion =  TxVersion.V0
const cluster = 'devnet' // 'mainnet' | 'devnet'

let raydium: Raydium | undefined
export const initSdk = async ({owner, wallet, loadToken = true }: { loadToken?: boolean; owner?:PublicKey, wallet:WalletContextState }) => {
  if (raydium) return raydium;
  console.log(`connect to rpc ${connection.rpcEndpoint} in ${cluster}`);

  raydium = await Raydium.load({
    owner,
    signAllTransactions: wallet.signAllTransactions,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: !loadToken,
    blockhashCommitment: 'finalized',
  });

  /**
   * By default: sdk will automatically fetch token account data when need it or any sol balance changed.
   * if you want to handle token account by yourself, set token account data after init sdk
   * code below shows how to do it.
   * note: after call raydium.account.updateTokenAccount, raydium will not automatically fetch token account
   */
  
  /*  
  raydium.account.updateTokenAccount(await fetchTokenAccountData());
  connection.onAccountChange(owner, async () => {
    raydium!.account.updateTokenAccount(await fetchTokenAccountData());
  });
  */

  return raydium;
};


export const fetchTokenAccountData = async (owner:PublicKey) => {
  const solAccountResp = await connection.getAccountInfo(owner)
  const tokenAccountResp = await connection.getTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID })
  const token2022Req = await connection.getTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID })
  const tokenAccountData = parseTokenAccountResp({
    owner: owner,
    solAccountResp,
    tokenAccountResp: {
      context: tokenAccountResp.context,
      value: [...tokenAccountResp.value, ...token2022Req.value],
    },
  })
  return tokenAccountData
}