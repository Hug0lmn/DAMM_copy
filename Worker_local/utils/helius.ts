import { Connection, 
	PublicKey, 
    Transaction,
  	ComputeBudgetProgram } from "@solana/web3.js";

import bs58 from 'bs58';

export async function get_fee_estimate(api_key : string, transaction_instruction : any, connection : Connection, wallet_PubKey : PublicKey){

    let transaction = new Transaction();
    transaction.add(transaction_instruction);

    let latestBlockhash = await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = wallet_PubKey;

    const serializedTx = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    const base58Tx = bs58.encode(serializedTx);

    const HELIUS_URL = `https://mainnet.helius-rpc.com/?api-key=${api_key}`;
    const response = await fetch(HELIUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'getPriorityFeeEstimate',
        params: [{
          transaction: base58Tx, // Base58 encoded transaction
          options: {
            recommended: true // Defaults to medium(50th percentile)
          }
        }]
      })
    });

    const fees = await response.json()
    console.log("fees",fees.result.priorityFeeEstimate);
    transaction = new Transaction();

    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: fees.result.priorityFeeEstimate
      });

    transaction.add(priorityFeeIx);

    latestBlockhash = await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = wallet_PubKey;
    transaction.add(transaction_instruction);

    return transaction
}