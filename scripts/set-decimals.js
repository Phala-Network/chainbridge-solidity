require('dotenv').config();
const BridgeJson = require('../build/contracts/Bridge.json');
const ethers = require('ethers');

async function setDecimals(env, bridge, handler, token, srcDecimals, destDecimals) {
    const bridgeInstance = new ethers.Contract(bridge, BridgeJson.abi, env.wallet);
    const tx = await bridgeInstance.adminSetDecimals(handler, token, srcDecimals, destDecimals);
    console.log(`Set token ${token} decimals, src: ${srcDecimals}, dest: ${destDecimals}, check tx ${tx.hash}`);
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
    const handler = process.env.HANDLER;
    const token = process.env.TOKEN;
    const srcDecimals = process.env.SRC;
    const destDecimals = process.env.DEST;

    await setDecimals(env, bridge, handler, token, srcDecimals, destDecimals);
}

main()
    .catch(console.error)
    .finally(() => process.exit());