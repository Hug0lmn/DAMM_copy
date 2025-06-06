import { JupiterQuoteResponse, JupiterSwapResponse, Env } from "../utils/types";
import { Keypair, Connection, VersionedTransaction } from "@solana/web3.js";

export async function GetQuote(input_token : string, output_token : string, amount : number){

	console.log("🔍 Récupération de la quote...");
	const response = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${input_token}\
		&outputMint=${output_token}\
		&amount=${amount}\
		&restrictIntermediateTokens=true\
		&dynamicSlippage=true`
		);

  	if (!response.ok) {
    	  throw new Error(`Quote API error: ${response.status} ${response.statusText}`);
    	}

	const quoteResponse = await response.json() as JupiterQuoteResponse;

	return quoteResponse;
	}

export async function Getswap(quoteResponse : any, keypair : Keypair){

	const response = await fetch('https://quote-api.jup.ag/v6/swap', {
    	method: 'POST',
    	headers: {
      		'Content-Type': 'application/json'
    	},
    	body: JSON.stringify({
      		quoteResponse,
      		userPublicKey: keypair.publicKey.toString(),
      		wrapAndUnwrapSol: true,
	  		dynamicComputeUnitLimit: true, // Set this to true to get the best optimized CU usage.
      		dynamicSlippage: { // This will set an optimized slippage to ensure high success rate
        		maxBps: 300 // Make sure to set a reasonable cap here to prevent MEV
      		},
	  		prioritizationFeeLamports: {
        		priorityLevelWithMaxLamports: {
          			maxLamports: 5000000, //0.005 Sol
		  			global: false,
          			priorityLevel: "high" // If you want to land transaction fast, set this to use `veryHigh`. You will pay on average higher priority fee.
        		}
      		}
    	})
  	});

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Swap API error: ${response.status} ${response.statusText} - ${errorBody}`);
    };

	const swapResponse = await response.json() as JupiterSwapResponse;
    
    if (!swapResponse.swapTransaction) {
      throw new Error("No swap transaction returned from API");
    };

    return swapResponse;
}

export async function executeSwap(env : any, input_token : string, output_token : string, amount : number, payerKeypair : Keypair, connection : Connection) {
	try {
		//Obtention de la quote
		const quoteResponse = await GetQuote(input_token, output_token , amount); //Here 10 000 000 = 0.01 Sol
		//Transaction de swap
		const {swapTransaction} = await Getswap(quoteResponse, payerKeypair);

		//Signature de la transaction
		console.log("✍️ Signature de la transaction...");
		const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
		var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

		transaction.sign([payerKeypair]);
		const latestBlockHash = await connection.getLatestBlockhash();

		//Envoi de la transaction
		const rawTransaction = transaction.serialize()
		const txid = await connection.sendRawTransaction(rawTransaction, {
  			skipPreflight: true,
  			maxRetries: 2
		});
		console.log(`🔗 Solscan: https://solscan.io/tx/${txid}`);

		//Confirmation de la transaction
		const confirmation = await connection.confirmTransaction({
 			blockhash: latestBlockHash.blockhash,
 			lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
 			signature: txid
		});

		 if (confirmation.value.err) {
      		throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    	}

		return ["✅ Swap exécuté avec succès!", `https://solscan.io/tx/${txid}`];

	} catch (error) {
   		return ["❌ Erreur lors du swap:", ""];
  	}
}