import { createClient } from '@supabase/supabase-js'
import { transaction_info } from './functions/transaction_info';
import { sendToTelegramTransfer } from './functions/telegram';
import 'dotenv/config';

const supabase = createClient(process.env.SUPA_URL!, process.env.SUPA_ANON!)
console.log("New transaction");

const channelA = supabase
  .channel('pending-txs-channel')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: "Transaction_timestamp", 
    },
    async (payload) => {
      const {Timestamp, feepayer, id, status, thread_id, tokentransfers, wallet_address } = payload.new;
      const Timestamp_ = new Date(Timestamp * 1000).toLocaleString();

      if (status == "Add_liquidity") {
          console.log("Add_liquidity");
          const amount = 10_000_000; //0.01 SOL  1SOL : 1_000_000_000
          const [Message] = await transaction_info(process.env, tokentransfers, "Add liquidity", amount, wallet_address);
          await sendToTelegramTransfer(process.env, `${Message}\nTimestamp: ${Timestamp_}`, thread_id);
        }

      else if (status == "Withdraw_liquidity") {
          console.log("Withdraw_liquidity");
          const [Message] = await transaction_info(process.env, tokentransfers, "Withdraw liquidity", 0, wallet_address);
  	      await sendToTelegramTransfer(process.env, `${Message}\nTimestamp: ${Timestamp_}`, thread_id);
        }
      }
  )
.subscribe((status) => {
    console.log('Subscription status:', status); // <= Important
  });