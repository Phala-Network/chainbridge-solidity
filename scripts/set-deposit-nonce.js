require('dotenv').config();
const BridgeJson = require('../build/contracts/Bridge.json');
const ethers = require('ethers');

async function setDepositNonce(env, bridge, chainId, depositNonce) {
    const bridgeInstance = new ethers.Contract(bridge, BridgeJson.abi, env.wallet);
    const tx = await bridgeInstance.adminSetDepositNonce(chainId, depositNonce);
    console.log(`Set deposit nonce to ${depositNonce} for chain id ${chainId}, check tx ${tx.hash}`);
}

async function main() {
    let env = {};
    env.url = process.env.ENDPOINT || 'http://localhost:8545';
    env.privateKey = process.env.KEY;
    env.provider = new ethers.providers.JsonRpcProvider(env.url);
    env.wallet = new ethers.Wallet(env.privateKey, env.provider);
    env.gasLimit = ethers.utils.hexlify(Number(process.env.GASLIMIT));
    env.gasPrice = ethers.utils.hexlify(Number(process.env.GASPRICE));

    const bridge = process.env.BRIDGE;
    const chainId = process.env.CHAIN;
    const depositNonce = process.env.NONCE;

    await setDepositNonce(env, bridge, chainId, depositNonce);
}

main()
    .catch(console.error)
    .finally(() => process.exit());