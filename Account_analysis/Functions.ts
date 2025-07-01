import fs from 'fs';
import fetch from 'node-fetch';

/** 
PART 0 : Global FUNCTIONS
**/

function delay(ms: number) {
//Serve as a little rest between each request because I have a free helius account and I have only 10 requests/sec
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTransaction(signatures : Array<string>, Helius_API_KEY : string) {
    const maxretries = 10;
    let retries = 0;

    while (retries < maxretries){
        const res = await fetch(`https://api.helius.xyz/v0/transactions?api-key=${Helius_API_KEY}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                transactions: signatures
            })
        });

        if (res.ok){
            return await res.json();
        } else if (!res.ok) {
        // HTTP response 429 Too Many Requests or 500
            console.error(`HTTP Error ${res.status}: ${res.statusText}`);
            await delay(200 * Math.pow(2, retries));
            retries ++;
            continue;
        }
    }
    console.log("failed maxretries");
    return [];
};


/**
PART 1 : FUNCTIONS related to signatures 
**/

async function FetchSignatures(before : string | null, POOL_ADDRESS : string, Helius_API_KEY : string){

    const body = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [
            POOL_ADDRESS,
            {
                limit: 1000, //Max limit is 1000 :[
                before: before || undefined, //before prevent us from parallelizing our requests
            },
        ],
    };
  
    const res = await fetch(`https://rpc.helius.xyz/?api-key=${Helius_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    const json = await res.json();
    return json.result || [];

}

export async function Get_signatures(address : string, Helius_API_KEY : string, Max_signatures : number, filename : string){
    
    const progress_file = `./${filename}.json`;

    const progress = {
    processedSignatures: new Set<string>(),
    lastBefore: null,
    };

    let keepGoing = true;
    let fetchedCount = 0;

    while (keepGoing) {
        try {
            const signatures = await FetchSignatures(progress.lastBefore, address, Helius_API_KEY);
            if (signatures.length === 0) break; //If no transactions is returned then stop the loop
      
            for (const sig of signatures) {
                const signature = sig.signature;

                if (progress.processedSignatures.has(signature)) {
                    continue
                } else { //Continue pass to the next iteration of the loop
                    progress.processedSignatures.add(signature);
                    fetchedCount++;
                }
            }
    
            progress.lastBefore = signatures[signatures.length - 1].signature; //Update the last transaction signature obtain

        if (fetchedCount >= Max_signatures) { //If our max is reach, stop the loop
            keepGoing = false;
            break;
        } else if (fetchedCount % 10000 === 0){
            console.log(`Fetched so far: ${fetchedCount}`)
        }

        } catch (error) {
            console.error("Error during transaction fetching :", error);
            console.log("1 second break before retry...");
            await new Promise(r => setTimeout(r, 1000)); 
        }
    }
    // Sauvegarde finale
    fs.writeFileSync(
        progress_file,
        JSON.stringify({
            processedSignatures: Array.from(progress.processedSignatures),
            lastBefore: progress.lastBefore,
        }, null, 2)
    );

  console.log('Transactions retrieved.');

}

/**
PART 2 : FUNCTIONS related to wallet analysis
**/

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

export async function Trans_wallet(Helius_API_KEY : string, filename : string, adress : string){
    const raw = fs.readFileSync(`${filename}.json`, 'utf-8');
    const data = JSON.parse(raw);
    const sol_key = "So11111111111111111111111111111111111111112";//Solana token adress
    
    const pool_map = new Map();
    const swap_map = new Map();

    //Parsing total
    let compteur = 0;
    while (compteur < data.processedSignatures.length){
        const transactions = await fetchTransaction(data.processedSignatures.slice(compteur,compteur+100), Helius_API_KEY);
        
        if (compteur % 5000 == 0 && compteur != 0) console.log(compteur);
    
        for (const transaction of transactions){
            compteur ++;
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
        await delay(110);
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

    console.log(`The wallet has a total profit of ${profit} SOL \nNumber of positions : ${nb_pos}\nWinrate : ${Math.round(winrate*1000)/10}%\nAverage win : ${Math.round(average*10000)/10000} SOL\n\n`);
    fs.writeFileSync(`final_map_${adress}.json`, JSON.stringify(Array.from(final_map.entries())));
};


/**
PART 3 : FUNCTION related to pool analysis
**/

export async function Trans_pool(Helius_API_KEY : string, filename : string, adress : string){
    const raw = fs.readFileSync(`${filename}.json`, 'utf-8');
    const data = JSON.parse(raw).processedSignatures.reverse(); //The first transactions are what we are interested in so .reverse()
    const global_map = new Map();
    const sol_key = "So11111111111111111111111111111111111111112";

    let compteur = 0;
    while (compteur < Math.round(data.length*0.2)){ //Arbitrary limit because most of the time, the liquidity is added at the beginning and withdraw not a lot of transaction after. Also a major part of transactions are not interesting for us so we limit the computation time. 
        //The most profitable wallet are the earliest
        const transactions = await fetchTransaction(data.slice(compteur,compteur+100), Helius_API_KEY);
        if (compteur % 5000 === 0 && compteur != 0) console.log(compteur);
        
        for (const transaction of transactions){
            compteur++;
            if (!transaction.transactionError === null) continue;
            else {
                const adding = transaction.tokenTransfers.some(tokenTransfers => tokenTransfers.toUserAccount === "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC");
                const withdraw = transaction.tokenTransfers.some(tokenTransfers => tokenTransfers.fromUserAccount === "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC");

                const new_map = new Map();
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

                const mini_array : [number, number] = [sol_token, other_token];

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
    await delay(100);
    }

    //Filter the result by SOL profit in descending order
    const final_map = Array.from(global_map.entries()).sort(([,val1], [,val2]) => val2[0]-val1[0])
    fs.writeFileSync(`output_pool_${adress}.json`, JSON.stringify(final_map));
    console.log('Mapped values:', new Map(final_map));

    //Take the 10 most profitable wallet if profit > 0.01 SOL
    const new_ = final_map.slice(0,10);
    const profitable_wallet : string[] = [];

    for (const fn in new_){
        const sol_profit = new_[fn][1][0] 

        if (sol_profit > 0.01){ //If SOL profit > 0.01 will analyze the wallet
            profitable_wallet.push(new_[fn][0])
        }
    }

    return profitable_wallet;
};