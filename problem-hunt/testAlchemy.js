import { ethers } from "ethers";

const ALCHEMY_URL = "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY";

async function testConnection() {
  const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);

  const blockNumber = await provider.getBlockNumber();
  console.log("Connected! Current block:", blockNumber);
}

testConnection();