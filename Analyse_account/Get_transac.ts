import fs from 'fs';
import fetch from 'node-fetch';
import 'dotenv/config';

const ADDRESS = 'GxasGPiSh3hRf2dW1KemcKv1Cdn7US1t5hBYbKcQNgwL';
const PROGRESS_FILE = './sign_transac.json';
const MAX_SIGNATURES = 2000; // change this limit if needed

interface Progress {
  processedSignatures: Set<string>;
  lastBefore: string | null;
}

let progress: Progress = {
  processedSignatures: new Set<string>(),
  lastBefore: null,
};

const fetchSignatures = async (before: string | null) => {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'getSignaturesForAddress',
    params: [
      ADDRESS,
      {
        limit: 1000, //Upper limit of transactions for one request
        before: before || undefined,
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


async function get_signatures(){

  let keepGoing = true;
  let fetchedCount = 0;

  while (keepGoing) {
    try {
        const signatures = await fetchSignatures(progress.lastBefore);
        if (signatures.length === 0) break;

        for (const sig of signatures) {
            const signature = sig.signature;

            if (progress.processedSignatures.has(signature)) continue; //Continue will pass to the next loop

                progress.processedSignatures.add(signature);
                fetchedCount++;

        if (fetchedCount >= MAX_SIGNATURES) {
            keepGoing = false;
            break;
        }
    }

        progress.lastBefore = signatures[signatures.length - 1].signature;

  //Save for each loop (in case of a crash)
        fs.writeFileSync(
            PROGRESS_FILE,
            JSON.stringify({
                processedSignatures: Array.from(progress.processedSignatures),
                lastBefore: progress.lastBefore,
            }, null, 2)
        );

        console.log(`Progress saved. Fetched so far: ${fetchedCount}`);
        await new Promise(r => setTimeout(r, 200));
        } catch (error) {
            console.error("Erreur lors de la récupération des signatures :", error);
            console.log("Pause de 5 secondes avant retry...");
            await new Promise(r => setTimeout(r, 5000)); // pause plus longue en cas d'erreur
        }
    }
    console.log('Scan terminé.');
    };

get_signatures();