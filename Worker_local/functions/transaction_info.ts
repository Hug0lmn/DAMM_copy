import bs58 from 'bs58';
import { Connection, Keypair } from '@solana/web3.js';
import { CpAmm } from "@meteora-ag/cp-amm-sdk";

import { ListTokens } from "../utils/types";
import { executeSwap } from "./swap";
import { pool_finding, withdraw_liquidity_pool, create_pos_add_liquidity } from "./pools";
import { getTokenSymbol, get_price, nb_token_owned, wallet_value } from "./tokens";
import { getGMGNLink, getJupiterLink } from "../utils/links";

/**
 * Get all the informations needed, from the Solana transaction, to send the telegram message through the specific designated channel
 *
 * @param env - Environment variables : uses API_KEY of Helius and SECRET_KEY from my personnal Solana wallet.
 * @param tokenTransfers - Json part of the request with all the informations about the tokens changes.
 * @param status - Indicate the type of action.
 * @param amount - Number of SOL to trade.
 * @param copy_wallet - Wallet adress that we are copying.
 * @returns The message to send through Telegram.
 *
 */

export async function transaction_info(
    env: any,  
    tokenTransfers : any,
    status: string,
	amount : number, 
    copy_wallet : string): Promise<[string]> {
	
//    console.log("Inside transaction info")
//	const author = feepayer;
	let not_sol: string;
	const list_tokens: ListTokens = {};
	const sol =  "So11111111111111111111111111111111111111112";

	for (const token of tokenTransfers) {
	  if (token.mint !== sol) { //WSOL token address
		not_sol = token.mint; //Identify the other token address
	  }
	
	  if (!list_tokens[token.mint]) { //If token doesn't exist in list_tokens create a new key
		list_tokens[token.mint] = { amount: token.tokenAmount, price: 0, size: 0, ticker: ""};
	  } else { // If exist then add just the amount (when they get back the liquidity, they can get reward for it and it denominated into another line)
		list_tokens[token.mint].amount += token.tokenAmount;
	  }
	}

	let swapmessage : string[] = [];
	let solscan : string[] = [];

	let newSolscan = "";
	let newMessage = "";
	const auto = "True"; 

	const own_wallet = Keypair.fromSecretKey(bs58.decode(env.SECRET_KEY)); //Get the publicKey of my wallet from my secret_key
	const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${env.API_KEY}`);
//	console.log("connection", connection);
	
	let link = "";

	if (status == "Add liquidity" && auto == "True"){
		//This equals to 0.001 SOL (base : 1 SOL = 1_000_000_000)
		[newMessage, newSolscan] = await executeSwap(env, sol, not_sol!, amount, own_wallet, connection);
		swapmessage.push(newMessage);
		solscan.push(newSolscan);

		console.log("Post execute swap");

		let token_nb = 0;
		token_nb = await nb_token_owned(env.API_KEY, own_wallet.publicKey, not_sol!, "adding"); //token_nb is in lamport so usable directly without modifying through decimals
		link = await pool_finding(not_sol!, copy_wallet, connection); //Find the PublicKey of the pool from the copy wallet
		console.log(token_nb, link);

		if (link != "Nothing Found"){
			[newMessage,newSolscan] = await create_pos_add_liquidity(env, own_wallet, link, token_nb, connection);
			swapmessage.push(newMessage);
			solscan.push(newSolscan);

			console.log("Post adding liquidity");
		}
	}

	else if (status == "Withdraw liquidity" && auto == "True"){
		link = await pool_finding(not_sol!, copy_wallet, connection);
		const cpAmm = new CpAmm(connection);
		const userPositions = await cpAmm.getPositionsByUser(own_wallet.publicKey);
		
		let token_nb = 0;
		token_nb = await nb_token_owned(env.API_KEY, own_wallet.publicKey, not_sol!, "withdraw"); //Check if I didn't add to the pool so will serve as a proxy

		if (userPositions.length>0){ //If my wallet has a position then I will use withdraw_liquidity_pool to try to see if this correspond to our token
			console.log(`User has ${userPositions.length} total positions`);
			[newMessage,newSolscan]  =  await withdraw_liquidity_pool(env, not_sol!, own_wallet, connection, cpAmm, userPositions);
			
			swapmessage.push(newMessage);
			solscan.push(newSolscan);
			
			if (newSolscan !== "no_signature"){ //If withdraw_liquidity_pool has exited a position then know how many I have and then swap them back to SOL
				token_nb = await nb_token_owned(env.API_KEY, own_wallet.publicKey, not_sol!, "withdraw");
				[newMessage, newSolscan] = await executeSwap(env, not_sol!, sol, token_nb, own_wallet, connection);
				
				swapmessage.push(newMessage);
				solscan.push(newSolscan);
				console.log("Execute swap post withdraw");
			}
		}
		else if (token_nb > 0){
			[newMessage, newSolscan] = await executeSwap(env, not_sol!, sol, token_nb, own_wallet, connection);
				
			swapmessage.push(newMessage);
			solscan.push(newSolscan);
			console.log("Execute swap no withdraw");
		}
	}

	let size_order = 0;

	for (const token of Object.keys(list_tokens)) { //Fill the other informations of list_tokens
	  list_tokens[token].ticker = await getTokenSymbol(env, token);
	  list_tokens[token].price = await get_price(token);
	  const size = (list_tokens[token].price ?? 0) * list_tokens[token].amount;
	  list_tokens[token].size = size;
	  size_order += size;
	}

	size_order = Math.round(size_order * 10) / 10;

	const tokenList = Object.values(list_tokens).map((entry) => entry.ticker).join(", ");
	
	const juplink = await getJupiterLink("SOL", not_sol!);
	const gmgnlink = await getGMGNLink(not_sol!);
	
	let value = await wallet_value(env, list_tokens["So11111111111111111111111111111111111111112"].price, copy_wallet);
	value = Math.round(value! * 10) / 10;
	
	const pourcent_value = Math.round((size_order/value)*100) / 100;

	console.log("value :", value);
	console.log("size_order :", size_order);

	console.log("Just before message")
	let message = "";
	if (status === "Add liquidity") {
	  message = `Nouveau DAMM ${size_order} (${pourcent_value}%) : \n${swapmessage}\n${solscan} \nSol size : ${list_tokens["So11111111111111111111111111111111111111112"].amount} <strong>\n${tokenList}</strong> \n<a href="${gmgnlink}">GMGN</a> / <a href="${juplink}">Jupiter</a> / <a href="${link}">Meteora</a>`;
	} else if (status === "Withdraw liquidity") {
	  message = `Fin DAMM ${size_order} (${pourcent_value}%) : \n${swapmessage}\n${solscan} <strong>\n${tokenList}</strong> \n<a href="${gmgnlink}">GMGN</a> / <a href="${juplink}">Jupiter</a> / <a href="${link}">Meteora</a>`;
	}

	return [message];
  }
