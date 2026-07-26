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
await dataExchange.waitForDeployment();

console.log("Contract address:", await dataExchange.getAddress());
console.log("Deployment transaction", dataExchange.deploymentTransaction()?.hash);