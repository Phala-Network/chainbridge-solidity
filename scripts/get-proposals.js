// Usage:
//   FROM=565294 TO=575294 node scripts/get-proposals.js
require('dotenv').config();
const ethers = require('ethers');
const { ApiPromise, WsProvider } = require("@polkadot/api");
const typedefs = require('@phala/typedefs').phalaDev;
const fs = require('fs');
const BN = require('bn.js');

const ERC20ContractAddress = '0x6eD3bc069Cf4F87DE05c04C352E8356492EC6eFE';
const BridgeContractAddress = '0xC84456ecA286194A201F844993C220150Cf22C63';
const bn1e12 = new BN(10).pow(new BN(12));

function utf8ToHex(str) 
{
    return Array.from(str).map(c =>
        c.charCodeAt(0) < 128 ? c.charCodeAt(0).toString(16) :
        encodeURIComponent(c).replace(/\%/g,'').toLowerCase()
    ).join('');
}

function getDataHash(u256HexString, recipient) {
    const data = '0x' + 
        ERC20ContractAddress.substr(2) + 
        u256HexString + 
        ethers.utils.hexZeroPad(ethers.utils.bigNumberify(20).toHexString(), 32).substr(2) +  
        recipient.substr(2);

    return ethers.utils.keccak256(data);
}

async function getProposal(env, chain, nonce, u256HexString, recipient) {
    let ProposalStatus = ['Inactive', 'Active', 'Passed', 'Executed', 'Cancelled'];

    const bridgeAbI = require('../build/contracts/Bridge.json').abi;
    const bridge = new ethers.Contract(BridgeContractAddress, bridgeAbI, env.ethereumProvider);

    let dataHash = getDataHash(u256HexString, recipient);
    let proposal = await bridge.getProposal(chain, nonce, dataHash);
    // console.log(`Proposal information for deposit nonce ${nonce}`);
    // console.log(`  voted relayers: ${proposal._yesVotes}`);
    // console.log(`  proposal state: ${ProposalStatus[proposal._status]}`);
    return {
        votedRelayers: proposal._yesVotes,
        proposalStatus: ProposalStatus[proposal._status]
    };
}

async function fetchSomeBlocksHash(api, from, to) {
    console.log(`Start fetch batch blocks from ${from} to ${to}`);
    let promises = [];
    for (let height = from; height <= to; height++) {
        promises.push(
            new Promise(async (resolve, reject) => {
                const blockHash = await api.rpc.chain.getBlockHash(height)
                if (blockHash == null) {
                    reject(new Error(`Block ${height} does not exist`));
                }
                resolve(blockHash);

                // try {
                //     let block = await api.rpc.chain.getBlock(blockHash);
                //     await api.rpc.chain.getBlockHash(blockNumber)
                //     block.block.header.hash = blockHash;
                //     block.hash = await api.rpc.chain.getBlockHash(height);
                //     resolve(block.block);
                // } catch (e) {
                //     reject(e);
                // }
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
        console.log(`==> proposals belong to block ${hash}`);
        for (let i = 0; i < events.length; i++) {
            let args = events[i].fungibleTransfer;
            let bnString;
            if (typeof args.amount === 'string' || args.amount instanceof String) {
                bnString = args.amount.substr(2);
            } else {
                bnString = ethers.utils.hexZeroPad(ethers.utils.bigNumberify(args.amount).toHexString(), 32).substr(2)
            }
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
        console.log(`nSteps = ${nSteps}`);
        let startHeight = env.from;
        for (let counter = 0; counter < nSteps; counter++) {
            let from = startHeight;
            let to = counter === (nSteps -1) ? 
                from + (missingBlocks%step - 1) : 
                (from + step - 1);
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
    console.log(`proposals: ${proposals}`);

    const jsonStr = JSON.stringify(proposals, null, 2);
    console.log(`json str: ${jsonStr}`);
    fs.writeFileSync(`proposals-${env.from}-${env.to}.json`, jsonStr, { encoding: "utf-8" });
}

main()
.catch(console.error)
.finally(() => process.exit());