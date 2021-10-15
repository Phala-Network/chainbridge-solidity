// Usage:
//    KEY=<key> GASLIMIT=<gas limit> GASPRICE=<gas price> NONCE=<deposit nonce> AMOUNT=<amount> RECIPIENT=<ethereum address> node script/vote-proposal.js

require('dotenv').config();
const ethers = require('ethers');

const OriginChainId = 1;    // khala

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const waitForTx = async (provider, hash) => {
    console.log(`Waiting for tx: ${hash}`)
    while (!await provider.getTransactionReceipt(hash)) {
        sleep(3000)
    }
}

function generateCalldata(u256HexString, recipient) {
    const data = '0x' + 
    u256HexString + 
    ethers.utils.hexZeroPad(ethers.utils.bigNumberify(20).toHexString(), 32).substr(2) +  
    recipient.substr(2);

    return data;
}

async function main() {
    let env = {};
    env.url = 'https://mainnet.infura.io/v3/6d61e7957c1c489ea8141e947447405b';
    env.privateKey = process.env.KEY;
    env.provider = new ethers.providers.JsonRpcProvider(env.url);
    console.log(`private: ${env.privateKey}, url: ${env.url}`);
    env.wallet = new ethers.Wallet(env.privateKey, env.provider);
    env.gasLimit = ethers.utils.hexlify(Number(process.env.GASLIMIT));
    env.gasPrice = ethers.utils.hexlify(Number(process.env.GASPRICE));

    const nonce = process.env.NONCE;
    const amount = process.env.AMOUNT;
    const recipient = process.env.RECIPIENT;

    const bridgeAbI = require('../build/contracts/Bridge.json').abi;
    const bridge = new ethers.Contract('0xC84456ecA286194A201F844993C220150Cf22C63', bridgeAbI, env.provider);

    let bnString;
    if (typeof amount === 'string' || amount instanceof String) {
        bnString = amount.substr(2);
    } else {
        bnString = ethers.utils.hexZeroPad(ethers.utils.bigNumberify(amount).toHexString(), 32).substr(2)
    }
    let calldata = generateCalldata(bnString, recipient);

    console.log(`Trying to execute proposal...`);
    // contract method: function executeProposal(uint8 chainID, uint64 depositNonce, bytes calldata data, bytes32 resourceID)
    let executeTx = await bridge.executeProposal(OriginChainId, nonce, calldata, '00000000000000000000000000000063a7e2be78898ba83824b0c0cc8dfb6001');
    await waitForTx(executeTx);
    console.log(`Transaction to execute proposal success!`);
}

main()
.catch(console.error)
.finally(() => process.exit());