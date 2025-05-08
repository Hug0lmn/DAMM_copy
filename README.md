This project is no longer updated since November 2024.

This project purpose was to identify and inform me about specific transaction on suspected crypto wallet. These wallets were what is called "serial ruggers" and launched around 2 to 10 new cryptocoins a day, at the time.

In order to follow these wallets, I used :
    - A Cloudflare Worker
    - Helius's Webhook and RPC
    - Telegram's API
    - Raydium's API
    - Dexscreener's API
    - A Supabase database

To understand the flow of the code, here's an exemple of what it does normally :

1. A specific wallet, entered in the Helius's Webhook perform a transaction on Solana's Blockchain. This transaction involve swapping 10 SOL against a new crypto.

2. The webhook send a request to the Cloudflare worker, which will analyze the transaction and parse specific information from the request (such as time of transaction, type of transaction...).

3. If the transaction is confirmed as a swap, the program will check if it's a new crypto coin or not through the Supabase database :

    1. If it's the first interaction with the specific new crypto coin, it will create a new row and send a specific message through the Telegram bot indicating so.

    2. If it's not the first interaction, it will check some specific conditions to know if the transaction represent the rug or not and send a specific message accordingly.