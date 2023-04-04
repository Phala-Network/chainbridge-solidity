const ethers = require('ethers');

const ERC20HandlerAddress = '0xcd38b15a419491c7c1238b0659f65c755792e257';
function getDataHash(u256HexString, recipient) {
    const data = '0x' + 
        ERC20HandlerAddress.substr(2) + 
        u256HexString + 
        ethers.zeroPadValue(ethers.toBeHex(20), 32, true).substr(2) +  
        recipient.substr(2);
    return ethers.keccak256(data);
}

function proposalToHuman(proposal) {
    const proposalStatusName = ['Inactive', 'Active', 'Passed', 'Executed', 'Cancelled'];
    return {
        resourceID: proposal._resourceID,
        dataHash: proposal._dataHash,
        yesVotes: proposal._yesVotes.map(resolveAddr),
        noVotes: proposal._noVotes.map(resolveAddr),
        status: proposalStatusName[proposal._status],
        proposedBlock: proposal._proposedBlock,
    };
}

const knownRelayers = {
    '0xa97dc452ca3699c4eb62171fe2f994ff7ae48400': 'Relayer-1',
    '0xdca0f5b3686cc87415100808a2568879fe74e01a': 'Relayer-2',
    '0x4ee535be2ce432151916e36b3c684e1db8cbf8c1': 'Relayer-3',
};
function resolveAddr(a) {
    return knownRelayers[a.toLowerCase()] || a;
}

module.exports = {getDataHash, proposalToHuman, resolveAddr};