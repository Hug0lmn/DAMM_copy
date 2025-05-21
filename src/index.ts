/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// src/templates/basic/index.ts
import { Connection, PublicKey } from "@solana/web3.js";
import { CpAmm } from "@meteora-ag/cp-amm-sdk";

type Env = {
  BOT_TOKEN: string;
  CHAT_ID: string;
  API_KEY: string;
};

type TokenTransfer = {
  mint: string;
  fromUserAccount: string;
  toUserAccount: string;
  tokenAmount: number;
};

type Instructions = {
	accounts : string;
};

type BodyType = {
  feePayer: string;
  type: string;
  tokenTransfers: TokenTransfer[];
  instructions : Instructions[];
  timestamp: number;
};

type AuthorEntry = {
  name: string;
  threadId: number;
  amount: number;
};

type AuthorMap = Record<string, AuthorEntry>;

type ListTokens = Record<
  string,
  {
	amount: number;
	price: number;
	size: number;
	ticker: string;
  }
>;

const src_default = {
  async fetch(request: Request, env: Env): Promise<Response> {
	if (request.method === "POST") {
	  const requestBody: BodyType[] = await request.json();
	  const Body = requestBody[0];

	  const authorMap: AuthorMap = {
		'DbSjRwKCtxGu4XTfbfQLYHRviCPDoCiTtEGE9sQP7iHY': { name: "Scammeur 2", threadId: 2, amount: 0 },
		'3HT99D3t3PHYojqkaagyx4xfQ9SjyUzS7F972ZjhRSyM': { name: "Follow scammeur 2", threadId: 5, amount: 0 },
		'FNay34Y1YJ634DHyzgQPTHgqojAirbLKp3uPHTRDwCBn': { name: "Scammeur", threadId: 14, amount: 20 },
		'FyAvdoJtjFhPgHFP7gHmrVPP5Cnbe4ebGzmmex54YPAv': { name: "Scammeur 4", threadId: 743, amount: 200 },
		'GicMHZkMDxgpNt6EoW9ADd9ovEwQ7ZGooRWLxm2sTUFL': { name: "Follow scammeur 4", threadId: 748, amount: 0 },
		'9xtNwPBdjM8WWmotpkUscwMwWqspggduKvAsHRiYpdkN': { name: "Scammeur 5", threadId: 750, amount: 0 },
		'CRBYGyfcRSiwcpUr4qxbVeR7MDNb32mkhxxzFAN7iinS': { name: "Scammeur 3", threadId: 752, amount: 0 },
		'FtjtJVQRTbH7fTf9eXSL8NHo4qfj4jcNxjM4JniTDUSi': { name: "DAMM copy", threadId: 2, amount: 0 },
	  };

	  const transfer = Body.tokenTransfers[0];
	  const isTargeted = authorMap[Body.feePayer] &&
		(Body.type === "TRANSFER" || Body.type === "UNKNOWN") &&
		(transfer.fromUserAccount == "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC" ||
		  transfer.toUserAccount == "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC");

	  if (isTargeted) {
		console.log("Received POST request with body:", Body);

		const first_token = await this.getTokenSymbol(env, Body.tokenTransfers[0].mint);
		const second_token = await this.getTokenSymbol(env, Body.tokenTransfers[1].mint);
		const swapping = first_token !== second_token;

		const Timestamp = new Date(Body.timestamp * 1000).toLocaleString();
		const author = Body.tokenTransfers[0].fromUserAccount;

		if (author === "FtjtJVQRTbH7fTf9eXSL8NHo4qfj4jcNxjM4JniTDUSi") {
		  const [Message, thread_id] = await this.transaction_info(env, authorMap, Body, "Add liquidity");
		  await this.sendToTelegramTransfer(env, `${Message}\nTimestamp: ${Timestamp}`, thread_id);
		} else if (author === "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC") {
		  const [Message, thread_id] = await this.transaction_info(env, authorMap, Body, "Withdraw liquidity");
		  await this.sendToTelegramTransfer(env, `${Message}\nTimestamp: ${Timestamp}`, thread_id);
		} else {
		  console.log("Not in precedent condition");
		}

		return new Response("Logged POST request body.", { status: 200 });
	  } else {
		return new Response("Method not allowed.", { status: 405 });
	  }

	} else {
	  return new Response("Only POST method is allowed.", { status: 405 });
	}
  },

  //Send the whole message to the telegram API to post it
  async sendToTelegramTransfer(env: Env, message: string, thread: number): Promise<void> {
	const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
	const response = await fetch(telegramUrl, {
	  method: "POST",
	  headers: { "Content-Type": "application/json" },
	  body: JSON.stringify({
		chat_id: env.CHAT_ID,
		text: message,
		message_thread_id: thread,
		parse_mode: "HTML",
	  }),
	});
	const data = await response.json();
	if (!response.ok) console.error("Failed to send message to Telegram:", data);
  },

  //Identify the pool corresponding to 
  async pool_finding(pool : string, env: Env, non_sol_token: string , wallet_address: string): Promise<string> {
	console.log(`https://www.meteora.ag/dammv2/${pool}`);
	const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${env.API_KEY}`);
	const cpAmm = new CpAmm(connection);
	const userPublicKey = new PublicKey(wallet_address);
	const userPositions = await cpAmm.getPositionsByUser(userPublicKey);

	for (const pos of userPositions) {
	  const pool_address = pos.positionState.pool;
	  const poolState = await cpAmm.fetchPoolState(pool_address);

	  if (poolState.tokenAMint.toString() === non_sol_token) {
		console.log(`Meteora : https://www.meteora.ag/dammv2/${pool_address}`)
		return `https://www.meteora.ag/dammv2/${pool_address}`;
	  }
	}

	return "Nothing Found";
  },

  async getTokenSymbol(env: Env, mintAddress: string): Promise<string> {
	if (mintAddress === "So11111111111111111111111111111111111111112") {
	  return "SOL";
	}

	const url = `https://mainnet.helius-rpc.com/?api-key=${env.API_KEY}`;
	const payload = {
	  id: 1,
	  jsonrpc: "2.0",
	  method: "getAsset",
	  params: [mintAddress],
	};

	const response = await fetch(url, {
	  method: "POST",
	  headers: { accept: "application/json", "content-type": "application/json" },
	  body: JSON.stringify(payload),
	});

	const data = await response.json();
	return data.result.content.metadata.symbol;
  },

  async getJupiterLink(inputMint: string, outputMint: string): Promise<string> {
	return `https://jup.ag/swap/${inputMint}-${outputMint}`;
  },

  //Just construct the 
  async getGMGNLink(mint: string): Promise<string> {
	return `https://gmgn.ai/sol/token/${mint}`;
  },

  //Get the price of specified token by using Dexscreener API
  async get_price(token_address: string): Promise<number> {
	const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token_address}`);
	const data = await response.json();
	return data.pairs[0].priceUsd;
  },

  //Calculate the wallet value
  async wallet_value(env : Env, sol_val : number) {
    const options = {
    	method: 'POST',
    	headers: {'Content-Type': 'application/json'},
    	body: '{"jsonrpc":"2.0","id":"1","method":"getBalance","params":["FtjtJVQRTbH7fTf9eXSL8NHo4qfj4jcNxjM4JniTDUSi"]}'
  	};

  try {
  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${env.API_KEY}`, options)
  const res_proper = await res.json() as {
	  result: {
      	value: string;
  	  	};
	};

  const lamport_val = Number(BigInt(res_proper.result.value))/ Number(BigInt(1000000000));

  const wallet_value = sol_val * lamport_val;
  return wallet_value;
  }

  catch(err){
  	console.error(err);
  	}
  },

  async transaction_info(env: Env, authorMap: AuthorMap, body: BodyType, status: string): Promise<[string, number]> {
	const author = body.feePayer;
	let not_sol: string | null = null;

	const list_tokens: ListTokens = {};

	for (const token of body.tokenTransfers) {
	  if (token.mint !== "So11111111111111111111111111111111111111112") {
		not_sol = token.mint;
	  }

	  if (!list_tokens[token.mint]) {
		list_tokens[token.mint] = { amount: token.tokenAmount, price: 0, size: 0, ticker: ""};
	  } else {
		list_tokens[token.mint].amount += token.tokenAmount;
	  }
	}

	const link = await this.pool_finding(body.instructions[1].accounts[1], env, not_sol!, "FtjtJVQRTbH7fTf9eXSL8NHo4qfj4jcNxjM4JniTDUSi")
	console.log(`Link : ${link}`);

	let size_order = 0;
	for (const token of Object.keys(list_tokens)) {
	  list_tokens[token].ticker = await this.getTokenSymbol(env, token);
	  list_tokens[token].price = await this.get_price(token);
	  const size = (list_tokens[token].price ?? 0) * list_tokens[token].amount;
	  list_tokens[token].size = size;
	  size_order += size;
	}
	size_order = Math.round(size_order * 10) / 10;

	const { name, threadId } = authorMap[author];
	const tokenList = Object.values(list_tokens).map((entry) => entry.ticker).join(", ");
	const juplink = await this.getJupiterLink("SOL", not_sol!);
	const gmgnlink = await this.getGMGNLink(not_sol!);
	let value = await this.wallet_value(env, list_tokens["So11111111111111111111111111111111111111112"].price);
	value = Math.round(value! * 10) / 10;

	const pourcent_value = Math.round((size_order/value)*100) / 100;

	let message = "";
	if (status === "Add liquidity") {
	  message = `Nouveau DAMM ${size_order} sur ${value} (${pourcent_value}%) : \nSol size : ${list_tokens["So11111111111111111111111111111111111111112"].amount} <strong>\n${tokenList}</strong> \n<a href="${gmgnlink}">GMGN</a> / <a href="${juplink}">Jupiter</a> / <a href="${link}">Meteora</a>`;
	} else if (status === "Withdraw liquidity") {
	  message = `Fin DAMM ${size_order} sur ${value} (${pourcent_value}%) : <strong>\n${tokenList}</strong> \n<a href="${gmgnlink}">GMGN</a> / <a href="${juplink}">Jupiter</a> / <a href="${link}">Meteora</a>`;
	}

	return [message, threadId];
  },
};

export default src_default;