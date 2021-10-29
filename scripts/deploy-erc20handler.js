// Usage:
//    KEY=<key> GASLIMIT=<gas limit> GASPRICE=<gas price> ENDPOINT=<ethereum endpoint> node script/deploy-erc20handler.js


require('dotenv').config();
const ethers = require('ethers');

const ERC20Handler = require('../build/contracts/ERC20Handler.json');
const BridgeAddress = '0xC84456ecA286194A201F844993C220150Cf22C63';
const PHAAdderss = '0x6c5ba91642f10282b576d91922ae6448c9d52f4e';
const ResourceId = '0x00000000000000000000000000000063a7e2be78898ba83824b0c0cc8dfb6001';

async function deployERC20Handler(env) {
    const factory = new ethers.ContractFactory(ERC20Handler.abi, ERC20Handler.bytecode, env.wallet);
    const contract = await factory.deploy(BridgeAddress, [ResourceId], [PHAAdderss], [], { gasPrice: env.gasPrice, gasLimit: env.gasLimit});
    await contract.deployed();
    env.erc20Handler = contract.address;
    console.log("✓ ERC20Handler deployed", contract.address);
}

async function main() {
    let env = {};
    env.url = process.env.ENDPOINT || 'https://mainnet.infura.io/v3/6d61e7957c1c489ea8141e947447405b';
    env.privateKey = process.env.KEY;
    env.provider = new ethers.providers.JsonRpcProvider(env.url);
    console.log(`private: ${env.privateKey}, url: ${env.url}`);
    env.wallet = new ethers.Wallet(env.privateKey, env.provider);
    env.gasLimit = ethers.utils.hexlify(Number(process.env.GASLIMIT));
    env.gasPrice = ethers.utils.hexlify(Number(process.env.GASPRICE));

    await deployERC20Handler(env);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
