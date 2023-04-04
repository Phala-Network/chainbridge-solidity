// Usage:
//    KEY=<key> GASLIMIT=<gas limit> GASPRICE=<gas price> NONCE=<deposit nonce> AMOUNT=<amount> RECIPIENT=<ethereum address> node script/execute-proposal.js

require('dotenv').config();
const { ethers } = require('ethers');
const utils = require('./utils');

const PHA_RID_ON_PHALA = '0x00b14e071ddad0b12be5aca6dffc5f2584ea158d9b0ce73e1437115e97a32a3e'
const PHA_RID_ON_KHALA = '0x00e6dfb61a2fb903df487c401663825643bb825d41695e63df8af6162ab145a6'
const BRIDGE_ON_ETHEREUM = '0x8F92e7353b180937895E0C5937d616E8ea1A2Bb9';

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
    ethers.zeroPadValue(ethers.toBeHex(20), 32, true).substr(2) + 
    recipient.substr(2);

    return data;
}

async function main() {
    const url = process.env.URL;
    const privateKey = process.env.KEY;
    const provider = new ethers.JsonRpcProvider(url);
    const wallet = new ethers.Wallet(privateKey, provider);
    const gasLimit = Number(process.env.GASLIMIT);
    const gasPrice = Number(process.env.GASPRICE);

    const nonce = parseInt(process.env.NONCE);
    const amount = ethers.toBeHex(process.env.AMOUNT);
    const recipient = process.env.RECIPIENT;
    const srcChainId = parseInt(process.env.SRC);

    const bridgeAbI = require('../build/contracts/Bridge.json').abi;
    const readonlyBridge = new ethers.Contract(BRIDGE_ON_ETHEREUM, bridgeAbI, provider);
    const bridge = readonlyBridge.connect(wallet);

    let bnString = ethers.zeroPadValue(amount, 32, true).substr(2);
    let calldata = generateCalldata(bnString, recipient);
    let dataHash = utils.getDataHash(bnString, recipient);
    let resourceID;
    if (srcChainId == 1) {
        resourceID = PHA_RID_ON_KHALA;
    } else if (srcChainId == 3) {
        resourceID = PHA_RID_ON_PHALA;
    } else {
        throw new Error("Invalid source chain ID, expect 1-Khala, 2-Phala");
    }

    console.log(`dataHash: ${dataHash}`);

    console.log('Checking proposal status...');
    const proposal = await readonlyBridge.getProposal(srcChainId, nonce, dataHash);
    const parsedProposal = utils.proposalToHuman(proposal);
    console.log(parsedProposal);
    if (parsedProposal.status != 'Passed') {
        console.error('Proposal status is not Passed');
        process.exit(-1);
    }

    console.log(`Trying to execute proposal...`);
    // contract method: function executeProposal(uint8 chainID, uint64 depositNonce, bytes calldata data, bytes32 resourceID)
    let executeTx = await bridge.executeProposal(
        srcChainId,
        nonce,
        calldata,
        resourceID,
        { gasLimit, gasPrice }
    );
    await waitForTx(provider, executeTx.hash);
    console.log(`Transaction to execute proposal success!`);
}

main()
.catch(console.error)
.finally(() => process.exit());