require('dotenv').config();
const ERC20Handler = require('../build/contracts/ERC20Handler.json');
const ethers = require('ethers');

async function deployERC20Handler(env, bridge, intialRid, initialToken) {
    const factory = new ethers.ContractFactory(ERC20Handler.abi, ERC20Handler.bytecode, env.wallet);

    const contract = await factory.deploy(bridge, [intialRid], [initialToken], [], { gasPrice: env.gasPrice, gasLimit: env.gasLimit});
    await contract.deployed();
    console.log("✓ ERC20Handler contract deployed: " + contract.address);
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
    const rid = process.env.RID;
    const token = process.env.TOKEN;

    await deployERC20Handler(env, bridge, rid, token)
}

main()
    .catch(console.error)
    .finally(() => process.exit());