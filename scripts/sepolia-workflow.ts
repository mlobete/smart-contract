import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { network } from "hardhat";

// DEPLOYMENT ADDRESS! Must replace
const contractAddress = "0xB95F1dE8f865749b28c347a5df04e36c7Fa534aa";
const datasetPath = "evaluation_data/ciciot2023_sample.csv";
const datasetUri = "local://ciciot2023_sample.csv";

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
console.log("Gas used (units):", receipt.gasUsed.toString());
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

    const datasetId = await dataExchange.getDatasetCount();

    console.log("Dataset ID:", datasetId.toString());

    await sendAndReport(
        "1. Register dataset",
        dataExchange.connect(seller).registerDataset(datasetUri, digest)
    );

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

    const rejectedDatasetId = await dataExchange.getDatasetCount();

    await sendAndReport(
        "5. Register dataset for rejection",
        dataExchange.connect(seller).registerDataset(datasetUri, digest)
    );

    await sendAndReport(
        "6. Buyer requests access for rejection",
        dataExchange.connect(buyer).requestAccess(rejectedDatasetId)
    );

    await sendAndReport(
        "7. Seller rejects access",
        dataExchange.connect(seller).rejectAccess(rejectedDatasetId, buyer.address)
    );

    console.log(
        "\nBuyer has access after rejection:",
        await dataExchange.hasAccess(rejectedDatasetId, buyer.address)
    );

    console.log(
        "Rejected request:",
        await dataExchange.getRequest(rejectedDatasetId, buyer.address)
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});