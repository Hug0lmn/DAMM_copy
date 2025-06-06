export type JupiterQuoteResponse = {
    inputMint: string;
    inAmount: string;
    outputMint: string;
    outAmount: string;
    otherAmountThreshold: string;
    swapMode: string;
    slippageBps: number;
    platformFee?: any;
    priceImpactPct: string;
    routePlan: Array<{
        swapInfo: {
            ammKey: string;
            label: string;
            inputMint: string;
            outputMint: string;
            inAmount: string;
            outAmount: string;
            feeAmount: string;
            feeMint: string;
        };
        percent: number;
    }>;
    contextSlot?: number;
    timeTaken?: number;
}

export type JupiterSwapResponse = {
    swapTransaction: string;
    lastValidBlockHeight: number;
    prioritizationFeeLamports?: number;
    computeUnitLimit?: number;
};

export type Env = {
  BOT_TOKEN: string;
  CHAT_ID: string;
  API_KEY: string;
  SECRET_KEY: string;
  SUPA_KEY: string;
  SUPA_URL: string;
};

export type TokenTransfer = {
  mint: string;
  fromUserAccount: string;
  toUserAccount: string;
  tokenAmount: number;
};

export type Instructions = {
	accounts : string;
};

export type BodyType = {
  feePayer: string;
  type: string;
  tokenTransfers: TokenTransfer[];
  instructions : Instructions[];
  timestamp: number;
};

export type AuthorEntry = {
  name: string;
  threadId: number;
  amount: number;
};

export type AuthorMap = Record<string, AuthorEntry>;

export type ListTokens = Record<
  string,
  {
	amount: number;
	price: number;
	size: number;
	ticker: string;
  }
>;