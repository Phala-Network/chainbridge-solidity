const ethers = require('ethers');

const ERC20ContractAddress = '0x6eD3bc069Cf4F87DE05c04C352E8356492EC6eFE';
const BridgeContractAddress = '0xC84456ecA286194A201F844993C220150Cf22C63';

function utf8ToHex(str) 
{
    return Array.from(str).map(c =>
        c.charCodeAt(0) < 128 ? c.charCodeAt(0).toString(16) :
        encodeURIComponent(c).replace(/\%/g,'').toLowerCase()
    ).join('');
}

function getDataHash(amount, recipient) {
    const data = '0x' + 
        ERC20ContractAddress.substr(2) + 
        ethers.utils.hexZeroPad(ethers.utils.bigNumberify(amount).toHexString(), 32).substr(2) + 
        ethers.utils.hexZeroPad(ethers.utils.bigNumberify(20).toHexString(), 32).substr(2) +  
        recipient.substr(2);

    return ethers.utils.keccak256(data);
}

async function getProposal(env, chain, nonce, amount, recipient) {
    let ProposalStatus = ['Inactive', 'Active', 'Passed', 'Executed', 'Cancelled'];

    const bridgeAbI = require('../build/contracts/Bridge.json').abi;
    const bridge = new ethers.Contract(BridgeContractAddress, bridgeAbI, env.provider);

    let dataHash = getDataHash(amount, recipient);
    let proposal = await bridge.getProposal(chain, nonce, dataHash);
    console.log(`Proposal information for deposit nonce ${nonce}`);
    console.log(`  voted relayers: ${proposal._yesVotes}`);
    console.log(`  proposal state: ${ProposalStatus[proposal._status]}`);
}

async function main() {
    let env = {};
    env.url = 'https://mainnet.infura.io/v3/6d61e7957c1c489ea8141e947447405b';
    env.provider = new ethers.providers.JsonRpcProvider(env.url);

    // [env, chainId, deposit_nonce, u128_amount, ethereum_address]
    await getProposal(env, 1, 12, '53000000000000', '0x8b270b5e5023d7f2851ab5ffad7da46ecc5f8b0b');
}

main()
.catch(console.error)
.finally(() => process.exit());