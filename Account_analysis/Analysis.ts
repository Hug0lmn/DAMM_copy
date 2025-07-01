import 'dotenv/config';
import { Get_signatures, Trans_pool, Trans_wallet } from './Functions';

let adress = "FkKyp6JBXDcFqFCHULr1JYqrTsck1D9giQfRm2CBKcxA"; //
const Helius_API_KEY = process.env.API_KEY;
const filename = "OUIOUI";
const type_ = "pool";

(async()=>{
    if (type_ == "wallet"){
        await Get_signatures(adress, Helius_API_KEY!, 10000, filename);
        console.log(`Analyzing ${adress} wallet transactions...`);
        await Trans_wallet(Helius_API_KEY!, filename,adress);
    }
    else if (type_ == "pool"){
        await Get_signatures(adress, Helius_API_KEY!, 500000, filename);
        console.log(`Analyzing ${adress} pool transactions...`);
        const profitable_wallet = await Trans_pool(Helius_API_KEY!, filename, adress);

        for (const wallet_adress of profitable_wallet){//Analyzing the most profitable wallet
            await Get_signatures(wallet_adress, Helius_API_KEY!, 10000, filename);
            console.log(`Analyzing ${wallet_adress} wallet transactions...`);
            await Trans_wallet(Helius_API_KEY!, filename, adress);
        }
}
;})
()

