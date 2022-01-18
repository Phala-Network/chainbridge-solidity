require('dotenv').config();
const MintableERC20Json = require('../build/contracts/MintableERC20.json');
const ethers = require('ethers');

async function addMinter(env, token, minter) {
    const factory = new ethers.ContractFactory(MintableERC20Json.abi, MintableERC20Json.bytecode, env.wallet);
    const erc20Instance = new ethers.Contract(token, MintableERC20Json.abi, env.wallet);
    let MINTER_ROLE = await erc20Instance.MINTER_ROLE();
    const tx = await erc20Instance.grantRole(MINTER_ROLE, minter);
    console.log(`Adding ${minter} as a minter on contract ${token}, check tx ${tx.hash}`);
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

    const token = process.env.TOKEN;
    const minter = process.env.MINTER;

    await addMinter(env, token, minter);
}

main()
    .catch(console.error)
    .finally(() => process.exit());