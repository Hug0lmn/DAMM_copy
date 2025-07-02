# 📂 Folder: Analyse_Account

## 📄 Purpose
This folder contains code for collecting and analyzing data on DAMM v2 pools and wallets in order to identify profitable wallets based on their transaction histories through Meteora DAMM v2 — with the potential goal of replicating their strategies.

## 🔄 Planned Improvements

- **Optimize Computation Time**  
  Instead of manually running the script each time, implement a workflow to automatically identify the top-performing DAMM pools and analyze them without manual intervention.

- **Add Wallet Activity Visualization**  
  Create a new module or script to visualize wallet activity, including charts or summaries of transaction patterns, volumes, and other insightful metrics.

- **Implement Date-Based Filtering**  
  Add options to filter wallet transactions or signatures by a specified date range, enabling more targeted analysis over specific time periods.

- **Create a Personal Database**  
  In addition to saving analysis results in JSON files, store them in a Supabase database for better organization, retrieval, and future analysis.

## 📦 Contents

- **`Function.ts`** – Contains all utility functions used in `Analysis.ts`. Includes functions for retrieving transactions for specific addresses (wallets or pools).

- **`Analysis.ts`** – The main analysis script. Depending on the chosen mode, it can:
  - Analyze a single wallet’s DAMM performance (including capital gains from swapping tokens back to SOL).
  - Identify top-performing wallets within a DAMM liquidity pool and analyze their performance.

## 🧪 How to Use

1. Open `Analysis.ts`.
2. Add your private Helius API key.
3. Run `Analysis.ts` with the parameter in the command line such as : npx tsx Analysis.ts wallet adress filename
