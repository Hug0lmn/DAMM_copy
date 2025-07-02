import 'dotenv/config';
import { Get_signatures, Trans_pool, Trans_wallet } from './Functions';

const Helius_API_KEY = process.env.API_KEY;
const args = process.argv.slice(2);
console.log(args);

if (args.length !== 1) {
    console.error("Usage: node script.js <wallet|pool> <adress> <filename>");
    process.exit(1);
}

const type_ = args[0];
let adress = args[1];
const filename = args[2];

if (type_ !== "wallet" && type_ !== "pool") {
    console.error(`Invalid argument: ${type_}. Use "wallet" or "pool".`);
    process.exit(1);
} else if (typeof adress === 'string') {
    console.error(`Invalid argument: ${adress}. Use string type.`);
    process.exit(1);
} else if (typeof filename === 'string') {
    console.error(`Invalid argument: ${filename}. Use string type.`);
    process.exit(1);
}

(async()=>{
    if (type_ == "wallet"){
        await Get_signatures(adress, Helius_API_KEY!, 10000);
        console.log(`Analyzing ${adress} wallet transactions...`);
        await Trans_wallet(Helius_API_KEY!, filename,adress);
    }
    else if (type_ == "pool"){
        await Get_signatures(adress, Helius_API_KEY!, 500000);
        console.log(`Analyzing ${adress} pool transactions...`);
        const profitable_wallet = await Trans_pool(Helius_API_KEY!, filename, adress);

        for (const wallet_adress of profitable_wallet){//Analyzing the most profitable wallet
            await Get_signatures(wallet_adress, Helius_API_KEY!, 10000);
            console.log(`Analyzing ${wallet_adress} wallet transactions...`);
            await Trans_wallet(Helius_API_KEY!, filename, adress);
        }
}
;})
()

