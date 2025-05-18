/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// src/templates/basic/index.js
import { createClient } from "@supabase/supabase-js";

var src_default = {
	async fetch(request, env) {
	  if (request.method === "POST") 
		{

		const requestBody = await request.json();
		const Body = requestBody[0]; //Body will be parsed to obtain the different informations about the transaction

		//Create a Map that contains informations necessary to send notifications through Telegram channels :
		// threadId represent the specific channel identification number on the telegram server to send message
		// amount : represent the minimum amount of SOL needed to be used to accept the transaction as valid
		// The key to identify is the wallet adress
		const authorMap = {
			'DbSjRwKCtxGu4XTfbfQLYHRviCPDoCiTtEGE9sQP7iHY': { name: "Scammeur 2", threadId: 2, amount : 0 },
			'3HT99D3t3PHYojqkaagyx4xfQ9SjyUzS7F972ZjhRSyM': { name: "Follow scammeur 2", threadId: 5, amount : 0 },
			'FNay34Y1YJ634DHyzgQPTHgqojAirbLKp3uPHTRDwCBn': { name: "Scammeur", threadId: 14, amount : 20},
			'FyAvdoJtjFhPgHFP7gHmrVPP5Cnbe4ebGzmmex54YPAv': { name: "Scammeur 4", threadId : 743, amount : 200},
			'GicMHZkMDxgpNt6EoW9ADd9ovEwQ7ZGooRWLxm2sTUFL' : { name: "Follow scammeur 4", threadId : 748, amount : 0},
			'9xtNwPBdjM8WWmotpkUscwMwWqspggduKvAsHRiYpdkN' : { name: "Scammeur 5", threadId : 750, amount : 0},
			'CRBYGyfcRSiwcpUr4qxbVeR7MDNb32mkhxxzFAN7iinS' : { name: "Scammeur 3", threadId : 752, amount : 0},
			'73W5Lh2jxuqevFyYTWRhdPZ9ZskScHKt2GLUiZU2qQcP' : { name: "DAMM copy", threadId : 2, amount : 0} 
		  };

		//console.log('Received POST request with body:', Body);
  
		//authorMap[Body.feePayer] checks if the specified wallet are the initiator of the transaction
		//Body.tokenTransfers[0] checks if a transfert of token is happening 
		// USDC_address = EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v so it's not a valid transaction
		if (authorMap[Body.feePayer] && (Body.type == "TRANSFER" || Body.type == "UNKNOWN") && (Body.tokenTransfers[0].fromUserAccount == "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC" || Body.tokenTransfers[0].toUserAccount == "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC")){

			console.log('Received POST request with body:', Body);
			const first_token = await this.getTokenSymbol(env, Body.tokenTransfers[0].mint);
			const second_token = await this.getTokenSymbol(env, Body.tokenTransfers[1].mint);
			const swapping = first_token !== second_token; //Make sure to be a transfer

			if (swapping === true){
		    	const Timestamp = new Date(Body.timestamp * 1000).toLocaleString(); 
		    	console.log(`Time : ${Timestamp}`);
		 
		    	const author = Body.tokenTransfers[0].fromUserAccount;

				if (author == "Hn1MyYYiynSCP2WLBMFxgwNJeAheVAfbXD92mFWKY39E"){
	
					const [Message, thread_id] = await this.transaction_info(env, authorMap, Body, "Add liquidity");
		  			const messageToSendTransfer = `${Message}\nTimestamp: ${Timestamp}`;
			
					await this.sendToTelegramTransfer(env, messageToSendTransfer, thread_id);
		
				}
				else if (author == "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"){

					const [Message, thread_id] = await this.transaction_info(env, authorMap, Body, "Withdraw liquidity");
		  			const messageToSendTransfer = `${Message}\nTimestamp: ${Timestamp}`;
			
					await this.sendToTelegramTransfer(env, messageToSendTransfer, thread_id);
				}
		  		else {
					console.log("Not in precedent condition");
	  				}

		  		}
		  		return new Response('Logged POST request body.', {status: 200});
				}
			else {
		  		return new Response('Method not allowed.', {status: 405})
	    	}
		}
		else {
      		return new Response("Only POST method is allowed.", { status: 405 });
		}
	},

	async sendToTelegramTransfer(env, message, thread) {
	// This function is used to send Transfer Updates to the Bot on Telegram
	  const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
	  const response = await fetch(telegramUrl, {
		method: "POST",
		headers: {
		  "Content-Type": "application/json"
		},
		body: JSON.stringify({
		  chat_id: env.CHAT_ID,
		  text: message,
		  message_thread_id: thread,
		  parse_mode: "HTML"
		})
	  });
	  const responseData = await response.json();
	  if (!response.ok) {
		console.error("Failed to send message to Telegram:", responseData);
	  }
	},

	async getTokenSymbol(env, mintAddress) {
	// Identify the token ticker
	  if (mintAddress === "So11111111111111111111111111111111111111112") {
		return "SOL";
	  }
	  const url = `https://mainnet.helius-rpc.com/?api-key=${env.API_KEY}`;
	  const payload = {
		id: 1,
		jsonrpc: "2.0",
		method: "getAsset",
		params: [mintAddress]
	  };
	  const headers = {
		"accept": "application/json",
		"content-type": "application/json"
	  };
	  const response = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify(payload)
	  });
	  const data = await response.json();
	  return data.result.content.metadata.symbol;
	},

	async getJupiterLink(inputMint, outputMint){
		return `https://jup.ag/swap/${inputMint}-${outputMint}`;
	},

	async getGMGNLink(mint){
	  //Create the Dexscreener link for the message
		return `https://gmgn.ai/sol/token/${mint}`;
	},

	async get_price(token_adress){
	// Access the dexscreener API to get the last price of the cryptocoin
		const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token_adress}`, {
			method: 'GET',
			headers: {},});
	  	const data = await response.json();

	  	return data["pairs"][0]["priceUsd"];},

	async transaction_info(env, authorMap, body, statut) {
	  //Regroup all the different info needed to send the update through Telegram Bot
		const author = body.feePayer;
		let not_sol = null;

		const list_tokens = {};
		for (const token of body.tokenTransfers){
			if (token.mint != "So11111111111111111111111111111111111111112"){
				not_sol = token.mint
			}
			if (!list_tokens[token.mint]) { //Add the amount of token in the dictionnary
				console.log(`Amount ${token.tokenAmount}`)
        		list_tokens[token.mint] = {
					amount : token.tokenAmount ,
					price : null,
					size : null,
					ticker : null
				}
    		} else {
        		list_tokens[token.mint].amount += token.tokenAmount;
    		}
		}

		let size_order = 0;
		for (const token of Object.keys(list_tokens)){
			list_tokens[token].ticker = await this.getTokenSymbol(env,token);
			list_tokens[token].price = await this.get_price(token);//Add the unitary value of the token in the dictionnnary
			
			const size = list_tokens[token].price * list_tokens[token].amount;
			list_tokens[token].size = size;
			size_order += size;
		};

		const { name, threadId, not_a_var} = authorMap[author];

		let Mess = "";

		if (statut === "Add liquidity"){
			const juplink = await this.getJupiterLink("SOL", not_sol);
			const gmgnlink = await this.getGMGNLink(not_sol);
			Mess = `Nouveau DAMM ${Math.round(size_order*10)/10}: <strong>${Object.values(list_tokens).map(entry => entry.ticker)}</strong> \n<a href="${gmgnlink}">GMGN</a> \n<a href="${juplink}">Swap on Jupiter</a>`;
		}

		else if  (statut === "Withdraw liquidity") {
			const juplink = await this.getJupiterLink("SOL", not_sol);
			const gmgnlink = await this.getGMGNLink(not_sol);
			Mess = `Fin DAMM ${Math.round(size_order*10)/10}: <strong>${Object.values(list_tokens).map(entry => entry.ticker)}</strong> \n<a href="${gmgnlink}">GMGN</a> \n<a href="${juplink}">Swap on Jupiter</a>`;
		}

		return [Mess, threadId];
	},

	};
  export {
	src_default as default
  };