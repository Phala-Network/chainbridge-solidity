// Usage:
//    KEY=<key> GASLIMIT=<gas limit> GASPRICE=<gas price> NONCE=<deposit nonce> AMOUNT=<amount> RECIPIENT=<ethereum address> node script/vote-proposal.js

require('dotenv').config();
const ethers = require('ethers');
const utils = require('./utils');

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
    const url = 'https://mainnet.infura.io/v3/6d61e7957c1c489ea8141e947447405b';
    const privateKey = process.env.KEY;
    const provider = new ethers.providers.JsonRpcProvider(url);
    const wallet = new ethers.Wallet(privateKey, provider);
    const gasLimit = ethers.utils.hexlify(Number(process.env.GASLIMIT));
    const gasPrice = ethers.utils.hexlify(Number(process.env.GASPRICE));

    const nonce = parseInt(process.env.NONCE);
    const amount = utils.asHexNumber(process.env.AMOUNT);
    const recipient = process.env.RECIPIENT;

    const bridgeAbI = require('../build/contracts/Bridge.json').abi;
    const readonlyBridge = new ethers.Contract('0xC84456ecA286194A201F844993C220150Cf22C63', bridgeAbI, provider);
    const bridge = readonlyBridge.connect(wallet);

    let bnString = ethers.utils.hexZeroPad(ethers.utils.bigNumberify(amount).toHexString(), 32).substr(2);
    let calldata = generateCalldata(bnString, recipient);
    let dataHash = utils.getDataHash(bnString, recipient);

    console.log('Checking proposal status...');
    const proposal = await readonlyBridge.getProposal(1, nonce, dataHash);
    const parsedProposal = utils.proposalToHuman(proposal);
    console.log(parsedProposal);
    if (parsedProposal.status != 'Passed') {
        console.error('Proposal status is not Passed');
        process.exit(-1);
    }

    console.log(`Trying to execute proposal...`);
    // contract method: function executeProposal(uint8 chainID, uint64 depositNonce, bytes calldata data, bytes32 resourceID)
    let executeTx = await bridge.executeProposal(
        OriginChainId,
        nonce,
        calldata,
        '0x00000000000000000000000000000063a7e2be78898ba83824b0c0cc8dfb6001',
        { gasLimit, gasPrice }
    );
    await waitForTx(provider, executeTx.hash);
    console.log(`Transaction to execute proposal success!`);

    const proposal = await readonlyBridge.getProposal(1, nonce, dataHash);
    const parsedProposal = utils.proposalToHuman(proposal);
    console.log(parsedProposal);
}

main()
.catch(console.error)
.finally(() => process.exit());