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

function swapping_parsing(transaction, fee_payer, sol_address, swap_map : Map<string, Array<number>>){
    const swap_out = transaction.tokenTransfers.some(tokenTransfers => tokenTransfers.fromUserAccount === fee_payer && tokenTransfers.mint !== sol_address);
    const swap_in = transaction.tokenTransfers.some(tokenTransfers => tokenTransfers.toUserAccount === fee_payer && tokenTransfers.mint !== sol_address);

    let sol_token = 0;
    let other_token = 0;
    let not_sol_address = "";
    
    if (swap_out && !swap_in){

        for (const transfer of transaction.tokenTransfers){
            if (transfer.mint !== sol_address && transfer.fromUserAccount === fee_payer){
                not_sol_address = transfer.mint;
                other_token += -transfer.tokenAmount;
            }
            else if (transfer.toUserAccount === fee_payer && transfer.mint === sol_address)
                sol_token += transfer.tokenAmount;
        }
    }
    else if (!swap_out && swap_in){
    
        for (const transfer of transaction.tokenTransfers){
            if (transfer.mint !== sol_address){
                not_sol_address = transfer.mint;
                other_token += transfer.tokenAmount; 
            }
            else if (transfer.fromUserAccount === fee_payer && transfer.tokenAmount > 0.0001)
                sol_token += -transfer.tokenAmount;
        }
    }

    else {
        return
    };

    const values = swap_map.get(not_sol_address) || [0, 0];
    values[0] += sol_token;
    values[1] += other_token;
    swap_map.set(not_sol_address, values);
};

function pool_parsing(transaction, sol_key, pool_map : Map <string, Array<number>>){

    const adding = transaction.tokenTransfers.some(tokenTransfers => tokenTransfers.toUserAccount === "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC");
    const withdraw = transaction.tokenTransfers.some(tokenTransfers => tokenTransfers.fromUserAccount === "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC");

    let sol_token = 0;
    let other_token = 0;
    let not_sol_address = "";

    if (withdraw && !adding){//Withdraw (Amount of the position and the fees are in different transfers)
        for (const transfer of transaction.tokenTransfers){
            if (transfer.mint === sol_key)
                sol_token += transfer.tokenAmount;
            else if (transfer.mint !== sol_key){
                other_token += transfer.tokenAmount;
                not_sol_address = transfer.mint;
            }
        }
    }
        
    else if (!withdraw && adding){//Adding 
        for (const transfer of transaction.tokenTransfers){
            if (transfer.mint === sol_key)
                sol_token += -transfer.tokenAmount;
            else if (transfer.mint !== sol_key){
                other_token += -transfer.tokenAmount;
                not_sol_address = transfer.mint
            }
        }
    }
    else {
        return
    };

    const mini_array : number[] = [];
    mini_array.push(sol_token, other_token);

    if (pool_map.has(not_sol_address)){//If a key already exist then calculate the number of tokens at the end
        const map_value = pool_map.get(not_sol_address)!;
        map_value[0] += mini_array[0];
        map_value[1] += mini_array[1];
        map_value[2] += 1;//map_value[2] represent the number of time that the pool has a transaction (add/remove)
        pool_map.set(not_sol_address, map_value)
    } else {//If a key doesn't exist then create a new one  
        mini_array.push(1)
        pool_map.set(not_sol_address, mini_array);
    }
};

async function main(){
    const raw = fs.readFileSync("progress_wallet.json", 'utf-8');
    const data = JSON.parse(raw);
    const sol_key = "So11111111111111111111111111111111111111112";
    
    const pool_map = new Map();
    const swap_map = new Map();

    let compteur = 100;
    while (compteur < data.processedSignatures.length){
        const transactions = await fetchTransaction(data.processedSignatures.slice(compteur-100,compteur));
        compteur += 100;
    
        for (const transaction of transactions){
            const fee_payer = transaction.feePayer;

            //transaction_type === "SWAP" represent swapping
            if (transaction.type === "SWAP")
                swapping_parsing(transaction, fee_payer, sol_key, swap_map);
            //transaction_type === "UNKNOWN" for withdrawal and "TRANSFER" for adding
            else
                pool_parsing(transaction, sol_key, pool_map);    
        }
    await delay(50);
    }
    fs.writeFileSync("output_wallet.json", JSON.stringify(Array.from(pool_map.entries())));
    console.log('Mapped values:', pool_map);
    console.log("Swap_values :", swap_map)
}
main();