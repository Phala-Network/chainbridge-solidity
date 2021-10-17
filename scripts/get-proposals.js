// Usage:
//   FROM=565294 TO=575294 node scripts/get-proposals.js
require('dotenv').config();
const ethers = require('ethers');
const { ApiPromise, WsProvider } = require("@polkadot/api");
const typedefs = require('@phala/typedefs').phalaDev;
const fs = require('fs');
const utils = require('./utils');

const BridgeContractAddress = '0xC84456ecA286194A201F844993C220150Cf22C63';

async function getProposal(env, chain, nonce, u256HexString, recipient) {
    let ProposalStatus = ['Inactive', 'Active', 'Passed', 'Executed', 'Cancelled'];

    const bridgeAbI = require('../build/contracts/Bridge.json').abi;
    const bridge = new ethers.Contract(BridgeContractAddress, bridgeAbI, env.ethereumProvider);

    let dataHash = utils.getDataHash(u256HexString, recipient);
    let proposal = await bridge.getProposal(chain, nonce, dataHash);
    return utils.proposalToHuman(proposal);
}

async function fetchSomeBlocksHash(api, from, to) {
    let promises = [];
    for (let height = from; height <= to; height++) {
        promises.push(
            new Promise(async (resolve, reject) => {
                const blockHash = await api.rpc.chain.getBlockHash(height)
                if (blockHash == null) {
                    reject(new Error(`Block ${height} does not exist`));
                }
                resolve(blockHash);
            })
        );
    }

    return await Promise.all(promises);
}

async function filterBridgeEvent(env, hash) {
    let proposals = [];
    let events = (await env.api.query.chainBridge.bridgeEvents.at(hash)).toJSON();
    // console.log(`==> events: ${JSON.stringify(events, null, 2)}`);
    if (events.length > 0) {
        console.log(`==> proposals exist in block ${hash}`);
        for (let i = 0; i < events.length; i++) {
            let args = events[i].fungibleTransfer;
            let bnString = ethers.utils.hexZeroPad(utils.asHexNumber(args.amount), 32).substr(2);
            // console.log(`big number: ${bnString}`);

            proposals.push({
                destId: args.destId,
                nonce: args.nonce,
                resourceId: args.resourceId,
                amount: args.amount,
                recipient: args.recipient,
                voteStatus: await getProposal(env, 1, args.nonce, bnString, args.recipient)
            });
        }
        console.log(JSON.stringify(proposals, null, 2));
    }
    return proposals;
}

async function processBlocks(env) {
    let proposals = [];
    const latestHeader = await env.api.rpc.chain.getHeader();
    const latestBlock = Number(latestHeader.number);
    console.log(`Get latest block: ${latestBlock}`);
    if (env.to === 0) env.to = latestBlock;

    let step = 100;
    let missingBlocks = env.to - env.from;
    if (missingBlocks <= 0) {
        throw new Error(`Wrong block height {${env.from}, ${env.to}}. qed`);
    }

    console.log(`step = ${step}, missingBlocks = ${missingBlocks}`);
    if (missingBlocks > step) {
        let nSteps = Math.floor(missingBlocks/step) + (missingBlocks%step === 0 ? 0 : 1);
        console.log(`steps to run: ${nSteps}`);
        let startHeight = env.from;
        for (let counter = 0; counter < nSteps; counter++) {
            let from = startHeight;
            let to = counter === (nSteps -1) ? 
                from + (missingBlocks%step - 1) : 
                (from + step - 1);
            console.log(`#[${counter}/${nSteps-1}] fetch batch block hash from ${from} to ${to}`);
            let hashList =  await fetchSomeBlocksHash(env.api, from, to);

            for (const hash of hashList) {
                try {
                    proposals = proposals.concat(await filterBridgeEvent(env, hash));
                    startHeight++;
                } catch (e) {
                    throw new Error(`Failed to parse block: error: ${e}`);
                }
            }
        }
    } else {
        let hashList = await fetchSomeBlocksHash(env.api, env.from, env.to);
        for (const hash of hashList) {
            try {
                proposals = proposals.concat(await filterBridgeEvent(env, hash));
            } catch (e) {
                throw new Error(`Failed to parse block: error: ${e}`);
            }
        }
    }

    return proposals;
}

async function main() {
    let env = {};
    env.ethereumUrl = 'https://mainnet.infura.io/v3/6d61e7957c1c489ea8141e947447405b';
    env.khalaUrl = 'wss://khala.api.onfinality.io/public-ws';
    env.ethereumProvider = new ethers.providers.JsonRpcProvider(env.ethereumUrl);
    env.khalaProvider = new WsProvider(env.khalaUrl);
    env.from = Number(process.env.FROM);
    env.to = Number(process.env.TO) || 0;

    env.api = await ApiPromise.create({provider: env.khalaProvider, types: typedefs});

    // fetch blocks and checkout bridge transfer
    let proposals = await processBlocks(env);

    const jsonStr = JSON.stringify(proposals, null, 2);
    fs.writeFileSync(`proposals-${env.from}-${env.to}.json`, jsonStr, { encoding: "utf-8" });
}

main()
.catch(console.error)
.finally(() => process.exit());