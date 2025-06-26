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
    let timestamp = 0;

    if (withdraw && !adding){//Withdraw (Amount of the position and the fees are in different transfers)
        timestamp = transaction.timestamp;

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
        timestamp = transaction.timestamp;
        
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

    const mini_array : [number, number, number, number, number] = [sol_token, other_token, timestamp, 0, 1];

    if (pool_map.has(not_sol_address)){//If a key already exist then calculate the number of tokens at the end
        const map_value = pool_map.get(not_sol_address)!;
        map_value[0] += mini_array[0];
        map_value[1] += mini_array[1];
        map_value[3] += mini_array[2];
        map_value[4] += 1;//map_value[4] represent the number of time that the pool has a transaction (add/remove)
        pool_map.set(not_sol_address, map_value);
    } else {//If a key doesn't exist then create a new one  
        pool_map.set(not_sol_address, mini_array);
    }
};

async function main(){
    const raw = fs.readFileSync("sign_wallet.json", 'utf-8');
    const data = JSON.parse(raw);
    const sol_key = "So11111111111111111111111111111111111111112";//Solana token adress
    
    const pool_map = new Map();
    const swap_map = new Map();

    //Parsing total
    let compteur = 0;
    while (compteur < data.processedSignatures.length){
        const transactions = await fetchTransaction(data.processedSignatures.slice(compteur,compteur+100));
        compteur += 100;
        
        if (compteur % 1000 == 0){
            console.log(compteur)
        }
    
        for (const transaction of transactions){
            const fee_payer = transaction.feePayer;

            if (transaction.transactionError === null){
                //transaction_type === "SWAP" represent swapping
                //A really small number of transactions are considered as "TRANSFER" but for evident reason, adding this will require a huge change in the code parsing to exclude transfer in a lower instance
                if (transaction.type === "SWAP")
                    swapping_parsing(transaction, fee_payer, sol_key, swap_map);
                //transaction_type === "UNKNOWN" for withdrawal and "TRANSFER" for adding
                else
                    pool_parsing(transaction, sol_key, pool_map);    
            }
        }
    await delay(50);
    }

    //Regroup swap and pool
    const final_map = new Map;
    for (const key of pool_map.keys()){
        const pool_amount = pool_map.get(key) || [0,0];
        const swap_amount = swap_map.get(key);

        if (swap_amount !== undefined){
            const mini_array: number[] = [
                pool_amount[0] + swap_amount[0],
                pool_amount[2],
                pool_amount[3]
            ];
            final_map.set(key, mini_array);
        };
    }

//    fs.writeFileSync("pool_map.json", JSON.stringify(Array.from(pool_map.entries())));
//    fs.writeFileSync("swap_map.json", JSON.stringify(Array.from(swap_map.entries())));
//    console.log('Mapped values:', pool_map);
//    console.log("Swap_values :", swap_map);
//    console.log("Final_map :", final_map);
    
    //Final result of the analysis and saving of transactions
    let profit = 0;
    let nb_pos = 0;
    let winrate = 0; 
    
    for (const value of final_map.values()){
        profit += value[0];
        nb_pos += 1;

        if (value[0] > 0){
            winrate += 1;
        }
    }

    winrate = winrate/nb_pos;
    const average = profit/nb_pos;

    console.log(`This wallet has a total profit of ${profit} SOL \nNumber of positions : ${nb_pos}\nWinrate : ${Math.round(winrate*1000)/10}%\nAverage win : ${Math.round(average*10000)/10000} SOL`);
    fs.writeFileSync("final_map.json", JSON.stringify(Array.from(final_map.entries())));
}
main();