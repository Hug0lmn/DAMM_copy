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
import { createClient } from "@supabase/supabase-js";

type Env = {
  BOT_TOKEN: string;
  CHAT_ID: string;
  API_KEY: string;
  SECRET_KEY: string;
  SUPA_KEY: string;
  SUPA_URL: string;
  SUPABASE_KEY: string;
  SUPABASE_URL: string;
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

type TokenTransfer = {
  mint: string;
  fromUserAccount: string;
  toUserAccount: string;
  tokenAmount: number;
};

type Instructions = {
	accounts : string;
};

type AuthorMap = Record<string, AuthorEntry>;


const src_default = {
  async fetch(request: Request, env: Env): Promise<Response> {
	if (request.method === "POST") {
	  const requestBody: BodyType[] = await request.json();
	  const Body = requestBody[0];

	  const wallet_ad = "FtjtJVQRTbH7fTf9eXSL8NHo4qfj4jcNxjM4JniTDUSi";

	  const authorMap: AuthorMap = {
		'DbSjRwKCtxGu4XTfbfQLYHRviCPDoCiTtEGE9sQP7iHY': { name: "Scammeur 2", threadId: 2, amount: 0 },
		'3HT99D3t3PHYojqkaagyx4xfQ9SjyUzS7F972ZjhRSyM': { name: "Follow scammeur 2", threadId: 5, amount: 0 },
		'FNay34Y1YJ634DHyzgQPTHgqojAirbLKp3uPHTRDwCBn': { name: "Scammeur", threadId: 14, amount: 20 },
		'FyAvdoJtjFhPgHFP7gHmrVPP5Cnbe4ebGzmmex54YPAv': { name: "Scammeur 4", threadId: 743, amount: 200 },
		'GicMHZkMDxgpNt6EoW9ADd9ovEwQ7ZGooRWLxm2sTUFL': { name: "Follow scammeur 4", threadId: 748, amount: 0 },
		'9xtNwPBdjM8WWmotpkUscwMwWqspggduKvAsHRiYpdkN': { name: "Scammeur 5", threadId: 750, amount: 0 },
		'CRBYGyfcRSiwcpUr4qxbVeR7MDNb32mkhxxzFAN7iinS': { name: "Scammeur 3", threadId: 752, amount: 0 },
		[wallet_ad] : { name: "DAMM copy", threadId: 2, amount: 0 },
	  };

	  const supabaseUrl = env.SUPABASE_URL;
	  const supabaseKey = env.SUPABASE_KEY;
	  const supabase = createClient(supabaseUrl, supabaseKey)

	  let { data, error } = await supabase
	  .from('Transaction_timestamp')
	  .select("*")
	  .eq("Timestamp", Body.timestamp);

	  console.log("Timestamp", Body.timestamp);
	  
	  if (error) {
		console.error('Error:', error)
	  } else {
  		console.log('All rows:', data?.length)
		}

	  //data_timestamp can't be null because if nothing is found it return []
	  if ((Body.tokenTransfers[0]) && (data!.length == 0)){
		
		const isTargeted = authorMap[Body.feePayer] &&
			(Body.type === "TRANSFER" || Body.type === "UNKNOWN") &&
			(Body.tokenTransfers[0].fromUserAccount == "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC" ||
		  	Body.tokenTransfers[0].toUserAccount == "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC");
			
	  	if (isTargeted) {
			console.log("Received POST request with body:", Body);

			const author = Body.tokenTransfers[0].fromUserAccount;
			
			if (author === wallet_ad) {  
				const {feePayer, tokenTransfers } = Body;
			
				console.log(Body.timestamp, feePayer, tokenTransfers, wallet_ad, authorMap[wallet_ad].threadId)
				const { data, error } = await supabase
  				.from('Transaction_timestamp')
  				.insert([
    			{ "Timestamp": Body.timestamp, "feepayer" : feePayer, "tokentransfers" : tokenTransfers, "wallet_address" : wallet_ad, "thread_id" : authorMap[wallet_ad].threadId, "status" : "Add_liquidity"},
  				])
  				.select()
			  	console.log('supa adding_liquidity:');
			  
			  	return new Response("Logged POST request body.", { status: 200 });

			} else if (author === "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC") {
				const {feePayer, tokenTransfers } = Body;
				
				const { data, error } = await supabase
  				.from('Transaction_timestamp')
  				.insert([
    			{ "Timestamp": Body.timestamp, "feepayer" : feePayer, "tokentransfers" : tokenTransfers, "wallet_address" : wallet_ad, "thread_id" : authorMap[wallet_ad].threadId, "status" : "Withdraw_liquidity"},
  				])
  				.select()			  
				
				console.log("supa withdraw");	
			
			  	return new Response("Logged POST request body.", { status: 200 });

			} else {
		  		console.log("Not in precedent condition");
				return new Response("Logged POST request body.", { status: 200 });
				}
		}
		return new Response("Method not allowed.", { status: 405 });
	  } else {
		return new Response("Method not allowed.", { status: 405 });
	  }

	} else {
	  return new Response("Only POST method is allowed.", { status: 405 });
	}
  },
};

export default src_default;