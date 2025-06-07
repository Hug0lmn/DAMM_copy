import fs from 'fs';
import 'dotenv/config';

function delay(ms: number) {
//Serve as a little rest between each request because I have a free helius account and I have only 10 requests/sec
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTransaction(signatures : Array<string>) {
const res = await fetch(`https://api.helius.xyz/v0/transactions?api-key=${process.env.API_KEY}`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    transactions: signatures
  })
});

  const json = await res.json();
  return json
};

async function main(){
    const raw = fs.readFileSync("pool_transac.json", 'utf-8');
    const data = JSON.parse(raw);
    const global_map = new Map();
    const sol_key = "So11111111111111111111111111111111111111112";

    let compteur = 0;
    while (compteur < data.processedSignatures.length){
        const transactions = await fetchTransaction(data.processedSignatures.slice(compteur,compteur+100));
        compteur += 100;
    
        for (const transaction of transactions){
            const adding = transaction.tokenTransfers.some(tokenTransfers => tokenTransfers.toUserAccount === "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC");
            const withdraw = transaction.tokenTransfers.some(tokenTransfers => tokenTransfers.fromUserAccount === "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC");

            let sol_token = 0;
            let other_token = 0;

            if (withdraw && !adding){//Withdraw (Amount of the position and the fees are in different transfers)
                for (const transfer of transaction.tokenTransfers){
                    if (transfer.mint === sol_key)
                        sol_token += transfer.tokenAmount;
                    else if (transfer.mint !== sol_key)
                        other_token += transfer.tokenAmount;
                }
            }
            else if (!withdraw && adding){//Adding 
                for (const transfer of transaction.tokenTransfers){
                    if (transfer.mint === sol_key)
                        sol_token += -transfer.tokenAmount;
                    else if (transfer.mint !== sol_key)
                        other_token += -transfer.tokenAmount;
                }
            }
            else {
                continue
            }

            const mini_array : number[] = [];
            mini_array.push(sol_token, other_token);
        
            if (global_map.has(transaction.feePayer)){//If a key already exist then calculate the number of tokens at the end
                const map_value = global_map.get(transaction.feePayer);
                map_value[0] = map_value[0] + mini_array[0];
                map_value[1] = map_value[1] + mini_array[1];
                map_value[2] = map_value[2] + 1;//map_value[2] represent the number of time that the pool has a transaction (add/remove)
                global_map.set(transaction.feePayer, map_value)
            } else {//If a key doesn't exist then create a new one  
                mini_array.push(1)
                global_map.set(transaction.feePayer, mini_array);
            }
        }
    }
    await delay(50);
    fs.writeFileSync("output_pool.json", JSON.stringify(Array.from(global_map.entries())));
    console.log('Mapped values:', global_map);
};
main()