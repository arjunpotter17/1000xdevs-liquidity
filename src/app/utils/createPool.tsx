import {
  DEVNET_PROGRAM_ID,
  getCpmmPdaAmmConfigId,
} from '@raydium-io/raydium-sdk-v2';
import BN from 'bn.js';
import { initSdk, txVersion } from './config';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getMint, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

interface PoolKeys {
  poolId: string;
  [key: string]: string;
}

export const createPool = async (
  wallet: WalletContextState,
  token1: string,
  token2: string,
  token1Amount: number,
  token2Amount: number
): Promise<{
  txId: string;
  poolKeys: PoolKeys;
} | null> => {
  if (!wallet.publicKey) {
    return null;
  }
  const owner = wallet.publicKey;
  const raydium = await initSdk({ loadToken: true, owner, wallet });



  const token1decimals = (await getMint(raydium.connection, new PublicKey(token1), "confirmed", TOKEN_2022_PROGRAM_ID)).decimals;
  const token2decimals = (await getMint(raydium.connection, new PublicKey(token2), "confirmed", TOKEN_2022_PROGRAM_ID)).decimals;

  const mintAAmount = token1Amount * 10 ** token1decimals;
  const mintBAmount = token2Amount * 10 ** token2decimals;


  console.log(token1, token2, token1Amount, token2Amount);
  const mintA = {
    address: token1,
    programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    decimals: token1decimals,
  };

  const mintB = {
    address: token2,
    programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    decimals: token2decimals,
  };

  console.log('mintA', mintA);
  console.log('mintB', mintB);

  const feeConfigs = await raydium.api.getCpmmConfigs();

  if (raydium.cluster === 'devnet') {
    console.log('feeConfigs', feeConfigs);
    feeConfigs.forEach((config) => {
      config.id = getCpmmPdaAmmConfigId(DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM, config.index).publicKey.toBase58();
    });
  }

  const { execute, extInfo } = await raydium.cpmm.createPool({
    programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
    poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
    mintA,
    mintB,
    mintAAmount: new BN(mintAAmount),
    mintBAmount: new BN(mintBAmount),
    startTime: new BN(0),
    feeConfig: feeConfigs[0],
    associatedOnly: false,
    ownerInfo: {
      useSOLBalance: true,
    },
    txVersion,
  });

  // Execute the transaction
  const { txId } = await execute({ sendAndConfirm: true });

  // Log the pool creation and pool keys
  console.log('pool created', {
    txId,
    poolKeys: {
      poolId: extInfo.address.poolId.toString(), // Directly access poolId
      ...Object.keys(extInfo.address).reduce(
        (acc, cur) => ({
          ...acc,
          [cur]: extInfo.address[cur as keyof typeof extInfo.address].toString(),
        }),
        {}
      ),
    },
  });

  // Return the txId and poolKeys, including poolId
  return {
    txId,
    poolKeys: {
      poolId: extInfo.address.poolId.toString(), // Access poolId directly
      ...Object.keys(extInfo.address).reduce(
        (acc, cur) => ({
          ...acc,
          [cur]: extInfo.address[cur as keyof typeof extInfo.address].toString(),
        }),
        {}
      ),
    },
  };
};
