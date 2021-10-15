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

async function main() {
    const url = 'https://mainnet.infura.io/v3/6d61e7957c1c489ea8141e947447405b';
    const privateKey = process.env.KEY;
    const provider = new ethers.providers.JsonRpcProvider(url);
    console.log(`private: ${privateKey}, url: ${url}`);
    wallet = new ethers.Wallet(privateKey, provider);
    const gasLimit = ethers.utils.hexlify(Number(process.env.GASLIMIT));
    const gasPrice = ethers.utils.hexlify(Number(process.env.GASPRICE));

    const nonce = parseInt(process.env.NONCE);
    const amount = utils.asHexNumber(process.env.AMOUNT);
    const recipient = process.env.RECIPIENT;

    const bridgeAbI = require('../build/contracts/Bridge.json').abi;
    const readonlyBridge = new ethers.Contract('0xC84456ecA286194A201F844993C220150Cf22C63', bridgeAbI, provider);
    const bridge = readonlyBridge.connect(wallet);

    let bnString = ethers.utils.hexZeroPad(ethers.utils.bigNumberify(amount).toHexString(), 32).substr(2);
    console.log({bnString, recipient});
    let dataHash = utils.getDataHash(bnString, recipient);

    console.log('Checking proposal status...');
    let proposal = await readonlyBridge.getProposal(1, nonce, dataHash);
    let parsedProposal = utils.proposalToHuman(proposal);
    console.log(parsedProposal);
    // skip now: parsedProposal.status != 'Inactive'
    if (parsedProposal.status != 'Active') {
        console.error('Proposal is not for voting');
        process.exit(-1);
    }
    const relayerName = utils.resolveAddr(wallet.address);
    if (parsedProposal.yesVotes.includes(relayerName) || parsedProposal.noVotes.includes(relayerName)) {
        console.error('Relayer already voted');
        process.exit(-1);
    }

    console.log(`Trying to vote on proposal ${dataHash}...`);
    // contract method: function voteProposal(uint8 chainID, uint64 depositNonce, bytes32 resourceID, bytes32 dataHash)
    let voteTx = await bridge.voteProposal(
        OriginChainId,
        nonce,
        '0x00000000000000000000000000000063a7e2be78898ba83824b0c0cc8dfb6001',
        dataHash,
        { gasLimit, gasPrice }
    );
    await waitForTx(provider, voteTx.hash);
    console.log(`Transaction to vote the proposal succeeded!`);

    console.log('Checking proposal status...');
    proposal = await readonlyBridge.getProposal(1, nonce, dataHash);
    parsedProposal = utils.proposalToHuman(proposal);
    console.log(parsedProposal);
}

main()
.catch(console.error)
.finally(() => process.exit());
