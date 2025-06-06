import fs from 'fs';
import 'dotenv/config';

function delay(ms: number) {
//Serve as a little rest between each request because I have a free helius account and I have only 10 requests/sec
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTransaction(signature : string) {
const res = await fetch(`https://rpc.helius.xyz/?api-key=${process.env.API_KEY}`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    jsonrpc : "2.0",
    id:"1",
    method:"getTransaction",
    params: [signature] 
  })
});

  const json = await res.json();
  return json
}

async function main(){
    const raw = fs.readFileSync("progress_wallet.json", 'utf-8');
    const data = JSON.parse(raw);
    const new_map = new Map();
    let compteur = 0;

    for (const sign of data.processedSignatures){
        const transac = await fetchTransaction(sign);
        compteur++;
    
        if (!(transac.error)){
        
            //Check if the transaction is an interaction with a pool Meteora
            const accountKeys = transac.result.transaction.message.accountKeys;
            const nft_address = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";//Origin adress for minting the Meteora NFT
            const pool_address = "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC";//Origin adress for creating new DAMM pool

            const interactWithPool = accountKeys.includes(pool_address);
            const interactWithNFT = accountKeys.includes(nft_address);
            const isRelevant = interactWithPool && interactWithNFT;

            //This section serve as recolting the amount of token send or received during the transaction
            const info = new Map();
            //const blockTime = transac.result.blockTime;

            if (isRelevant){
                for (const balance of transac.result.meta.postTokenBalances){
                    if (balance.owner == pool_address){
                        info.set(balance.mint, [
                            balance.owner, 
                            balance.programId,
                            balance.uiTokenAmount.uiAmount, 
                            balance.uiTokenAmount.decimals]);
                    }
                }

                for (const balance of transac.result.meta.preTokenBalances){
                    if (balance.owner == pool_address){
                        if (info.has(balance.mint)){//If the keys exist then modify the amount of token to know the number of token withdraw or add
            
                            const value = info.get(balance.mint);
                            value[2] = balance.uiTokenAmount.uiAmount - value[2];
                            info.set(balance.mint, value); 
                        }
                    else {//When the wallet add liquidity if it the first wallet to add liquidity then 
                        info.set(balance.mint, [
                            balance.mint, 
                            balance.programId,
                            -balance.uiTokenAmount.uiAmount, 
                            balance.uiTokenAmount.decimals]);
                        }
                    }
                }

                const mini_array : number[] = [];
                const sol_key = "So11111111111111111111111111111111111111112";

                if (info.has(sol_key)) {
                    mini_array.push(info.get(sol_key)[2]);
                }

                let keys_name = "";
                for (const [key, value] of info) {
                    if (key !== sol_key) {
                        keys_name = key;
                        mini_array.push(value[2]);
                    }
                }

                if (new_map.has(keys_name)){//If a key already exist then calculate the number of tokens at the end
                    const map_value = new_map.get(keys_name);
                    map_value[0] = map_value[0] + mini_array[0];
                    map_value[1] = map_value[1] + mini_array[1];
                    map_value[2] = map_value[2] + 1;//map_value[2] represent the number of time that the pool has a transaction (add/remove)
                    new_map.set(keys_name, map_value)
                } else {//If a key doesn't exist then create a new one  
                    mini_array.push(1)
                    new_map.set(keys_name, mini_array);
                }

            }
        }

        if (compteur%50 ===0){
            console.log(compteur)}
        await delay(125);
    }
    
    fs.writeFileSync("output_wallet.json", JSON.stringify(Array.from(new_map.entries())));
    console.log('Mapped values:', new_map);
}

main()