require('dotenv').config();
const MintableERC20Json = require('../build/contracts/MintableERC20.json');
const ethers = require('ethers');

async function deployERC20(env) {
    const factory = new ethers.ContractFactory(MintableERC20Json.abi, MintableERC20Json.bytecode, env.wallet);
    const contract = await factory.deploy("MoonPhalaToken", "MPHA", 0, "0xA29D4E0F035cb50C0d78c8CeBb56Ca292616Ab20", { gasPrice: env.gasPrice, gasLimit: env.gasLimit });
    await contract.deployed();
    env.mintableERC20Contract = contract.address;
    console.log("✓ Mintable ERC20 contract deployed", contract.address);
}

async function main() {
    let env = {};
    env.url = process.env.ENDPOINT || 'http://localhost:8545';
    env.privateKey = process.env.KEY;
    env.provider = new ethers.providers.JsonRpcProvider(env.url);
    console.log(`private: ${env.privateKey}, url: ${env.url}`);
    env.wallet = new ethers.Wallet(env.privateKey, env.provider);
    env.gasLimit = ethers.utils.hexlify(Number(process.env.GASLIMIT));
    env.gasPrice = ethers.utils.hexlify(Number(process.env.GASPRICE));

    await deployERC20(env);
}

main()
    .catch(console.error)
    .finally(() => process.exit());