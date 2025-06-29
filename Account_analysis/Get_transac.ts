import fs from 'fs';
import fetch from 'node-fetch';
import 'dotenv/config';

// === CONFIGURATION ===
const POOL_ADDRESS = 'CesNpCCJCZupVD19tZgrYSHSjzCcj381qaqqtK86TDen';
const PROGRESS_FILE = './sign_wallet.json';
const MAX_SIGNATURES = 10000; // change this limit if needed

// === FETCH SIGNATURES ===
const fetchSignatures = async (before: string | null) => {
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
  
  const res = await fetch(`https://rpc.helius.xyz/?api-key=${process.env.API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  return json.result || [];
};

// === MAIN LOOP ===

async function get_signatures(){

  const progress = {
    processedSignatures: new Set<string>(),
    lastBefore: null,
  };

  let keepGoing = true;
  let fetchedCount = 0;

  while (keepGoing) {
    try {
      const signatures = await fetchSignatures(progress.lastBefore);
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

    if (fetchedCount >= MAX_SIGNATURES) { //If our max is reach, stop the loop
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
    PROGRESS_FILE,
    JSON.stringify({
      processedSignatures: Array.from(progress.processedSignatures),
      lastBefore: progress.lastBefore,
    }, null, 2)
    );

  console.log('Transactions retrieved.');
}

get_signatures();