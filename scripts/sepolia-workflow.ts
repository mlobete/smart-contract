import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { network } from "hardhat";

// DEPLOYMENT ADDRESS! Must replace
const contractAddress = "0x87aBE574f7b093a98714F7707c5C7BC952BCf5f4";
const datasetPath = "temperature.csv";
const datasetUri = "local://temperature.csv";

function calculateDigest(filePath: string): string {
    return `0x${createHash("sha256").update(readFileSync(filePath)).digest("hex")}`;
}

async function sendAndReport(label: string, transactionPromise: Promise<any>) {
console.log(`\n#### ${label} ####`);

const startedAt = Date.now();
const transaction = await transactionPromise;
console.log("Transaction:", transaction.hash);

const receipt = await transaction.wait();
const elapsedMs = Date.now() - startedAt;

console.log("Block:", receipt.blockNumber);
console.log("Gas used:", receipt.gasUsed.toString());
console.log("Confirmation time (ms):", elapsedMs);
console.log("Etherscan:", `https://sepolia.etherscan.io/tx/${transaction.hash}`);

return receipt;
}

async function main() {
    const { ethers } = await network.create();
    const [seller, buyer] = await ethers.getSigners();
    console.log("Network: Ethereum Sepolia");
    console.log("Contract:", contractAddress);
    console.log("Seller:", seller.address);
    console.log("Buyer:", buyer.address);

    const digest = calculateDigest(datasetPath);

    console.log("\nDataset URI:", datasetUri);
    console.log("Locally calculated SHA-256 digest:", digest);

    const dataExchange = await ethers.getContractAt("DataExchange", contractAddress);

    await sendAndReport(
        "1. Register dataset",
        dataExchange.connect(seller).registerDataset(datasetUri, digest)
    );

    const datasetId = 0n;

    console.log("\nStored dataset:", await dataExchange.getDataset(datasetId));

    await sendAndReport(
        "2. Buyer requests access",
        dataExchange.connect(buyer).requestAccess(datasetId)
    );

    console.log(
        "\nRequest state:", 
        await dataExchange.getRequest(datasetId, buyer.address)
    );

    await sendAndReport(
        "3. Seller approves access",
        dataExchange.connect(seller).approveAccess(datasetId, buyer.address)
    );

    console.log("\nBuyer has access:",
        await dataExchange.hasAccess(datasetId, buyer.address)
    );

    await sendAndReport(
        "4. Seller records off-chain delivery",
        dataExchange.connect(seller).recordDelivery(datasetId, buyer.address)
    );

    console.log(
        "\nDelivery recorded:",
        await dataExchange.isDelivered(datasetId, buyer.address)
    );

    console.log(
        "Correct digest matches:",
        await dataExchange.verifyDigest(datasetId, digest)
    );

    const tamperedDigest = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    console.log(
        "Tampered digest matches:",
        await dataExchange.verifyDigest(datasetId, tamperedDigest)
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});


