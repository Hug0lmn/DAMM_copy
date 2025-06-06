import { PublicKey } from "@solana/web3.js";

//Will try to identify if the wallet owned a number of a specific token
export async function nb_token_owned(api_key : string, own_wallet : PublicKey, token_mint_address : string, status : string){
  const options = {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: `{"jsonrpc":"2.0","id":"1","method":"getTokenAccountsByOwner","params":["${own_wallet.toString()}",{"programId":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},{"encoding":"jsonParsed"}]}`
  };

    let amount = 0;
	
	try {
  		const resp = await fetch(`https://mainnet.helius-rpc.com/?api-key=${api_key}`, options);
  		const json = await resp.json();

  		for (const token of json.result.value){
    
  		  	if ((token.account.data.parsed.info.mint == token_mint_address) && (status == "adding")){
      			amount = Number(token.account.data.parsed.info.tokenAmount.uiAmount);  
      			console.log(amount);
      			break
	    	}
  		  	else if ((token.account.data.parsed.info.mint == token_mint_address) && (status == "withdraw")){
      			amount = Number(token.account.data.parsed.info.tokenAmount.amount);  
      			console.log(amount);
      			break
	    	}

  		}
  		
		return amount
	}catch(err){
      console.error("Failed to fetch token accounts:", err);
	  return amount;
  	}
}

//Get the price of specified token by using Dexscreener API (work)
export async function get_price(token_mint_address: string): Promise<number> {
	const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token_mint_address}`);
	const data = await response.json();
	return data.pairs[0].priceUsd;
  }

  //Calculate the wallet value (work)
export async function wallet_value(env : any, sol_val : number, copy_wallet : string) {
    const options = {
    	method: 'POST',
    	headers: {'Content-Type': 'application/json'},
    	body: `{"jsonrpc":"2.0","id":"1","method":"getBalance","params":[${copy_wallet}]}`
  	};

  try {
  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${env.API_KEY}`, options)
  const res_proper = await res.json() as {
	  result: {
      	value: string;
  	  	};
	};
	console.log(res_proper)

  const lamport_val = Number(BigInt(res_proper.result.value))/ Number(BigInt(1000000000));

  const wallet_value = sol_val * lamport_val;
  console.log(Number(BigInt(res_proper.result.value)));
  return wallet_value;
  }

  catch(err){
  	console.error(err);
  	}
  }

//Get the tocken ticker (Not touch since the previous repo)
export async function getTokenSymbol(env: any, token_mint_address: string): Promise<string> {
	if (token_mint_address === "So11111111111111111111111111111111111111112") {
	  return "SOL";
	}

	const url = `https://mainnet.helius-rpc.com/?api-key=${env.API_KEY}`;
	const payload = {
	  id: 1,
	  jsonrpc: "2.0",
	  method: "getAsset",
	  params: [token_mint_address],
	};

	const response = await fetch(url, {
	  method: "POST",
	  headers: { accept: "application/json", "content-type": "application/json" },
	  body: JSON.stringify(payload),
	});

	const data = await response.json();
	return data.result.content.metadata.symbol;
  }