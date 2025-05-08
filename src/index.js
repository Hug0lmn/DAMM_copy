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

const src_default = {
	async fetch(request, env) {
	  if (request.method === "POST") {

		const requestBody = await request.json();
		const Body = requestBody[0]; //Body will be parsed to obtain the different informations about the transaction

		//Create a Map that contains informations necessary to send notifications through Telegram channels :
		// threadId represent the specific channel identification number on the telegram server to send message
		// amount : represent the minimum amount of SOL needed to be used to accept the transaction as valid
		// The key to identify is the wallet adress
		const authorMap = {
			'FNay34Y1YJ634DHyzgQPTHgqojAirbLKp3uPHTRDwCBn': { name: "Scammeur", threadId: 14, amount : 20},
			'DbSjRwKCtxGu4XTfbfQLYHRviCPDoCiTtEGE9sQP7iHY': { name: "Scammeur 2", threadId: 2, amount : 0 },
			'3HT99D3t3PHYojqkaagyx4xfQ9SjyUzS7F972ZjhRSyM': { name: "Follow scammeur 2", threadId: 5, amount : 0 },
			'CRBYGyfcRSiwcpUr4qxbVeR7MDNb32mkhxxzFAN7iinS' : { name: "Scammeur 3", threadId : 752, amount : 0},
			'FyAvdoJtjFhPgHFP7gHmrVPP5Cnbe4ebGzmmex54YPAv': { name: "Scammeur 4", threadId : 743, amount : 200},
			'GicMHZkMDxgpNt6EoW9ADd9ovEwQ7ZGooRWLxm2sTUFL' : { name: "Follow scammeur 4", threadId : 748, amount : 0},
			'9xtNwPBdjM8WWmotpkUscwMwWqspggduKvAsHRiYpdkN' : { name: "Scammeur 5", threadId : 750, amount : 0}
		  };

		console.log('Received POST request with body:', Body);
  
		//authorMap[Body.feePayer] checks if the specified wallet are the initiator of the transaction
		//Body.tokenTransfers[0] checks if a transfert of token is happening 
		// USDC_address = EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v so it's not a valid transaction
		if (authorMap[Body.feePayer] && Body.tokenTransfers[1] && Body.tokenTransfers[1].mint !== "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"){
  
			const solscan = `https://solscan.io/account/${Body.feePayer}#defiactivities`;
			const tokenSend = await this.getTokenSymbol(env, Body.tokenTransfers[0].mint);
			const tokenReceived = await this.getTokenSymbol(env, Body.tokenTransfers[1].mint);
			const swapping = tokenSend !== tokenReceived; //True if the transfert is a swap

			if (swapping === true){
		    	const Timestamp = new Date(Body.timestamp * 1000).toLocaleString(); 
		    	console.log(`Time : ${Timestamp}`);
		 
		    //Supabase handling create or add new info to a row
		    	const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
		    	const author = Body.tokenTransfers[0].fromUserAccount;

		    	let token_ticker;
		    	let token_adress;

				//Swap Solana against another cryptocoin
		    	if (tokenSend === "SOL"){
					token_ticker = tokenReceived;
					token_adress = Body.tokenTransfers[1].mint;
		  		}

				//Swap another cryptocoin against Solana
		  		else if (tokenReceived === "SOL"){
					token_ticker = tokenSend;
					token_adress = Body.tokenTransfers[0].mint;
		  		}
  
		  		const sol_send = tokenSend === "SOL";
		  		const existing_row = await this.row_exist(supabase, author, token_ticker,token_adress);
		  		const rug_null = await this.timerug_null(supabase, author, token_ticker, token_adress) === true;

		  		if (existing_row === false && sol_send === true){ //New transaction
					this.add_row(supabase, author, token_ticker, token_adress, Timestamp);

					const [Message, thread_id] = await this.transaction_info(env, authorMap, tokenSend, tokenReceived, Body, "New_interaction");
		  			const messageToSendTransfer = `${Message}\nTimestamp: ${Timestamp}\nSolscan : ${solscan}`;
			
					await this.sendToTelegramTransfer(env, messageToSendTransfer, thread_id);
		  		}
		  
		  		else if (existing_row === true){ 
					//Rug
					if (sol_send === false && rug_null === true &&  Body.tokenTransfers[1].tokenAmount >= authorMap[Body.feePayer]['amount']){
						const price = await this.get_price(token_adress);
						this.add_timerug(supabase, author, token_ticker, token_adress, Timestamp, price);

						const [Message, thread_id] = await this.transaction_info(env, authorMap, tokenSend, tokenReceived, Body, "interaction_rug");
						const messageToSendTransfer = `${Message}\nTimestamp: ${Timestamp}\nSolscan : ${solscan}`;

		    			await this.sendToTelegramTransfer(env, messageToSendTransfer, thread_id);
		    		}
					//Token buyback before rug
		  			else if (sol_send === true && rug_null === true && Body.tokenTransfers[1].tokenAmount >= 10000000){
						const [Message, thread_id] = await this.transaction_info(env, authorMap, tokenSend, tokenReceived, Body, "interaction_rebuy");
						const messageToSendTransfer = `${Message}\nTimestamp: ${Timestamp}\nSolscan : ${solscan}`;

						await this.sendToTelegramTransfer(env, messageToSendTransfer, thread_id);
		    		}
			
		  			else {
						console.log("Not in precedent condition");
	  				}

		  		}
		  		return new Response('Logged POST request body.', {status: 200});
				}
				else {
		  			console.log(`Not Swapping`);
		  			return new Response('Method not allowed.', {status: 405})
	    		}
			}
//		console.log(`Not good author`);
		return new Response('Method not allowed.', {status: 405});
		}
	return new Response('Get not allowed.', {status: 405});
	},
  
	async row_exist(supabase,auth,tick,adress){
	// This function checks if a row exist by trying to access a row by the wallet adress, the cryptocoin ticker and cryptocoin adress
		const { data, error } = await supabase
			.from("Scammer_identifier")
			.select('*')
			.match({adress_scam : auth, coin_ticker : tick, token_adress : adress})
			.single();

		if (error){
			console.error('Row_exist error :', error.message);
			return false;
		}
		return !!data;
	},

	async add_row(supabase, auth, tick, adress, time){
	// This function will create a new row in a supabase database for further data analysis about the specific wallet pattern
		const{data, error : error3} = await supabase
			.from("Scammer_identifier")
			.insert([{adress_scam: auth, coin_ticker: tick, token_adress: adress, timestamp_mint : time}])
			.select();
		
		if (error3) {
			console.error("Add_row error :", error3);
		} else {
			console.log("Insert successful:", data);
			}
	},

	async add_timerug(supabase, auth, tick, adress, time, price){
	// This function will access an existing row, add the timestamp of the rug and the price of cryptocoin at the moment
		const{ data, error} = await supabase
		.from("Scammer_identifier")
		.update({ timestamp_rug : time, Price_rug : price})
		.match({adress_scam : auth, coin_ticker : tick, token_adress : adress}) // Filter for the specific row
		.select()

		if (error) {
			console.error('Add Timerug error :',error.message);
		}
		else {
			console.log("Updated row :", data);
		} 
	},

	async timerug_null(supabase, auth, tick, adress) {
	// Check that the cryptocoin hasn't been previously rugged by checking the value of the timestamp_rug variable
		const { data, error } = await supabase
		  .from("Scammer_identifier")
		  .select('*')
		  .match({adress_scam : auth, coin_ticker : tick, token_adress : adress}) // Filter for the specific row
		  .single(); // Ensure only one row is retrieved
		
		if (error) {
		  console.error('Timerug_null error :', error.message);
		  return false; // Return false if there's an error
		}
		return data['timestamp_rug'] === null;
	  },

	async get_price(token_adress){
	// Access the dexscreener API to get the last price of the cryptocoin
		const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token_adress}`, {
			method: 'GET',
			headers: {},});
	  	const data = await response.json();

	  	return data["pairs"][0]["priceUsd"];},

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

	async getRaydiumLink(inputMint, outputMint){
	  //Create the Raydium link for the message
	  return `https://raydium.io/swap/?inputMint=${inputMint}&outputMint=${outputMint}`;
	},

	async getDexLink(mint, author){
	  //Create the Dexscreener link for the message
		return `https://dexscreener.com/solana/${mint}?maker=${author}`;
	},

	async transaction_info(env, authorMap, tokenSend, tokenReceived, body, statut) {
	  //Regroup all the different info needed to send the update through Telegram Bot
		const author = body.tokenTransfers[0].fromUserAccount;
		const received_adress = body.tokenTransfers[1].mint;
		const send_adress = body.tokenTransfers[0].mint;

		let amountPaid = body.tokenTransfers[0].tokenAmount;
		let amountReceived = body.tokenTransfers[1].tokenAmount;

		if (!Number.isInteger(amountPaid)) {
		  amountPaid = Math.round(amountPaid * 100) / 100;
		  };
  
		if (!Number.isInteger(amountReceived)) {
		  amountReceived = Math.round(amountReceived * 100) / 100;
	    };

		const { name, threadId, not_a_var} = authorMap[author];
		console.log("Thread_id :", threadId);

		let Mess = "";

		if (statut === "New_interaction"){
			const raydiumlink = await this.getRaydiumLink("sol", received_adress);
			const dexlink = await this.getDexLink(received_adress, author);
			Mess = `NEW SCAM LAUNCH BY <strong>${name}</strong> : \n<strong>${tokenSend}</strong> to <a href="${dexlink}"><strong>${tokenReceived}</strong></a> \n<a href="${raydiumlink}">Swap on Raydium</a>`;
		}

		else if  (statut === "interaction_rebuy") {
			const raydiumlink = await this.getRaydiumLink(received_adress, 'sol');
			const dexlink = await this.getDexLink(received_adress, author);
			Mess = `\u{1F6A8} <b>ALERT PREPARE TO SCAM</b> by <b>${name}</b> : \n${amountPaid} ${tokenSend} to ${amountReceived} <a href="${dexlink}"><b>${tokenReceived}</b></a> \n<a href="${raydiumlink}">Swap on Raydium</a>`;
		}
	
		else if (statut === "interaction_rug") {
			const raydiumlink = await this.getRaydiumLink(send_adress, 'sol');
			const dexlink = await this.getDexLink(send_adress, author);
			Mess = `Rug finished by <strong>${name}</strong> : \n<a href="${dexlink}"><strong>${tokenSend}</strong></a> to <strong>${tokenReceived}</strong> \n<a href="${raydiumlink}">Swap on Raydium</a>`;
		}

		return [Mess, threadId];
	},

	};
  export {
	src_default as default
  };