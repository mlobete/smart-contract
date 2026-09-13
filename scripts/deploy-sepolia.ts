import { network } from "hardhat";

const { ethers } = await network.create();

const [seller, buyer] = await ethers.getSigners();

console.log("Seller/deployer:", seller.address);
console.log("Buyer:", buyer.address);


console.log("Seller balance:",
            ethers.formatEther(await ethers.provider.getBalance(seller.address)),
            "Sepolia ETH");

console.log("Buyer balance:",
            ethers.formatEther(await ethers.provider.getBalance(buyer.address)),
            "Sepolia ETH");

const dataExchange = await ethers.deployContract("DataExchange");

const deploymentTx = dataExchange.deploymentTransaction();

if (!deploymentTx) {
    throw new Error("Deployment transaction was unavailable.");
}

console.log("Deployment transaction:", deploymentTx.hash);

const submittedAt = Date.now();
const receipt = await deploymentTx.wait();

if (!receipt) {
    throw new Error("Deployment receipt was unavailable.");
}

console.log("Contract address:", await dataExchange.getAddress());
console.log("Block:", receipt.blockNumber);
console.log("Gas used (units):", receipt.gasUsed.toString());
console.log("Confirmation time (ms):", Date.now() - submittedAt);
console.log("Etherscan:", `https://sepolia.etherscan.io/tx/${deploymentTx.hash}`);