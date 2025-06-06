
//Construct the jup link (work)
 
export async function getJupiterLink(inputMint: string, outputMint: string): Promise<string> {
	return `https://jup.ag/swap/${inputMint}-${outputMint}`;
  }

//Construct the GMGN link (work)

export async function getGMGNLink(mint: string): Promise<string> {
	return `https://gmgn.ai/sol/token/${mint}`;
  }
