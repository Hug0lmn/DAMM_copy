import { Connection, 
	PublicKey, 
	Keypair, 
	sendAndConfirmTransaction,
    Transaction,
  	ComputeBudgetProgram } from "@solana/web3.js";

import { CpAmm, 
	derivePositionNftAccount,     
	getPriceFromSqrtPrice, 
    getTokenProgram } from "@meteora-ag/cp-amm-sdk";

import BN from "bn.js";

import { get_fee_estimate } from "../utils/helius";


export async function pool_finding(
	non_sol_token: string , 
	wallet_address: string,
	connection: Connection
	): Promise<string> {

	const userPublicKey = new PublicKey(wallet_address);
	const cpAmm = new CpAmm(connection);

	const maxRetries = 10;
	const delayMs = 1000;

	  for (let attempt = 0; attempt < maxRetries; attempt++) {
    	console.log(`🔄 Attempt ${attempt + 1} to find matching pool for token: ${non_sol_token}`);

	    try {
    	  const userPositions = await cpAmm.getPositionsByUser(userPublicKey);

      		for (const pos of userPositions) {
        		const pool_address = pos.positionState.pool;
        		const poolState = await cpAmm.fetchPoolState(pool_address);

		        if (
        		  poolState.tokenAMint.toString() === non_sol_token
        		) {
          		const link = pool_address.toString();
          		console.log(`✅ Match found: https://www.meteora.ag/dammv2/${link}`);
          		return link;
        		}
      		}
    	} catch (err) {
      		console.error("❌ Error while checking positions:", err);
    	}

    // Wait before the next retry
    await new Promise((res) => setTimeout(res, delayMs));
  }

  console.warn("🚫 No matching pool found after max retries.");
  return "Nothing Found";
}

export async function create_pos_add_liquidity(env : any, own_wallet : Keypair, pool_address : string, amount_token : number, connection : Connection){
	const cpAmm = new CpAmm(connection);

	const walletPublicKey = own_wallet.publicKey;
    const positionNftMint = Keypair.generate(); // This is a Keypair, not just a PublicKey
	const pool = new PublicKey(pool_address);

	const poolState = await cpAmm.fetchPoolState(pool);

	//Part token A
	const options = {
    	method: 'POST',
    	headers: {'Content-Type': 'application/json'},
    	body: `{"jsonrpc":"2.0","id":"1","method":"getTokenSupply","params":["${poolState.tokenAMint}"]}`
  	};

	const resp = await(await fetch(`https://mainnet.helius-rpc.com/?api-key=${env.API_KEY}`, options)).json();
    const decimals_token_A = resp.result.value.decimals;

    const token_A_amount = amount_token;
    const real_token_a_amount = token_A_amount*10**decimals_token_A;

	//Part token B
    let decimals_token_B = 0;
    if (poolState.tokenBMint == new PublicKey("So11111111111111111111111111111111111111112")){
      decimals_token_B = 9;
    }
    else {
      const options = {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: `{"jsonrpc":"2.0","id":"1","method":"getTokenSupply","params":["${poolState.tokenBMint}"]}`
      };
    const resp = await(await fetch(`https://mainnet.helius-rpc.com/?api-key=${env.API_KEY}`, options)).json();
    decimals_token_B = resp.result.value.decimals;    
    }  
  
    const price = Number(getPriceFromSqrtPrice(poolState.sqrtPrice, decimals_token_A, decimals_token_B));

    const token_B_amount = price*token_A_amount;
    const real_token_b_amount = token_B_amount*10**decimals_token_B;
    console.log(token_A_amount, token_B_amount);
    console.log(Math.round(real_token_a_amount), Math.round(real_token_b_amount));

	// Calculate liquidity delta first
    const liquidityDelta = await cpAmm.getLiquidityDelta({
      maxAmountTokenA: new BN(real_token_a_amount), 
      maxAmountTokenB: new BN(real_token_b_amount), 
      sqrtPrice: poolState.sqrtPrice,
      sqrtMinPrice: poolState.sqrtMinPrice,
      sqrtMaxPrice: poolState.sqrtMaxPrice
    });

    const add_create_pos_Tx = await cpAmm.createPositionAndAddLiquidity({
      owner: walletPublicKey,
      pool: pool,
      positionNft: positionNftMint.publicKey,
      liquidityDelta,
      maxAmountTokenA: new BN(real_token_a_amount),
      maxAmountTokenB: new BN(real_token_b_amount),
      tokenAAmountThreshold: new BN("18446744073709551615"),
      tokenBAmountThreshold: new BN("18446744073709551615"),
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAProgram: getTokenProgram(poolState.tokenAFlag),
      tokenBProgram: getTokenProgram(poolState.tokenBFlag),
    });

	const transaction = await get_fee_estimate(env.API_KEY, add_create_pos_Tx, connection, walletPublicKey);

    try {
        const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [own_wallet, positionNftMint], // Include all signers
        {"commitment" : "confirmed"}
      );
    console.log("Transaction confirmed with signature:", signature);
	return ["Liquidity_added", `https://solscan.io/tx/${signature}`];
    } catch (error) {
      console.error("Transaction failed or not confirmed:", error);
	  return ["Liquidity_not_added", "no_signature"];
    }
  }

  export async function withdraw_liquidity_pool(
	env : any,
	not_sol : string, 
	payerKeypair : Keypair, 
	connection : Connection, 
	cpAmm : CpAmm, 
	userPositions : any){

	let poolState : any;
	let position : PublicKey | undefined;
	let positionState : any;
	let positionNft : PublicKey | undefined;

	for (const pos of userPositions){

    	const pool = pos.positionState.pool;
		position = pos.position;

		poolState = await cpAmm.fetchPoolState(pool)
		positionState = await cpAmm.fetchPositionState(pos.position);

    	positionNft = positionState.nftMint;
  
		if (poolState.tokenBMint.equals(new PublicKey(not_sol))){
    		break
		}
	}

	const remove_close_tx = await cpAmm.removeAllLiquidityAndClosePosition({
		owner : payerKeypair.publicKey,
		position : position!,
		positionNftAccount : derivePositionNftAccount(positionNft!),
		poolState : poolState,
		positionState : positionState,
		tokenAAmountThreshold: new BN(0),
		tokenBAmountThreshold: new BN(0),
		vestings: [],
		currentPoint: new BN(0),
	})

	const transaction = await get_fee_estimate(env.API_KEY, remove_close_tx, connection, payerKeypair.publicKey);

	try {
    	const signature = await sendAndConfirmTransaction(
    	connection,
    	transaction,
    	[payerKeypair], // Include all signers
		{"commitment" : "confirmed"}
  		);

		console.log("Transaction confirmed with signature:", signature);
		return ["Pool fermée",  `https://solscan.io/tx/${signature}`];
	} catch (error) {
		console.error("Transaction failed or not confirmed:", error);
		return ["Erreur sur fermeture de la pool","no_signature"]
	}
}