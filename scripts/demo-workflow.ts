import { network}  from "hardhat";
import { hashDataset } from "./utils/crypto.js";
import { copyFileSync, mkdirSync, appendFileSync, rmSync} from "node:fs";
import { dirname, join } from "node:path";

const FILE_PATH = "evaluation_data/ciciot2023_sample.csv";
const DATASET_URI = "local://ciciot2023_sample.csv";

const { ethers } = await network.create();
const [seller, buyer] = await ethers.getSigners();


const buyerDeliveryDirectory = join(
    "deliveries",
    buyer.address
);

const deliveredFilePath = join(
    buyerDeliveryDirectory,
    "ciciot2023_sample.csv"
);

const tamperedFilePath = join(
    buyerDeliveryDirectory,
    "ciciot2023_sample-tampered.csv"
);

rmSync(buyerDeliveryDirectory, {recursive: true, force: true});


console.log("\n========iot dataset exchange mvp========");
console.log(`seller:    ${seller.address}`);
console.log(`buyer:     ${buyer.address}`);

const dataExchange = await ethers.deployContract("DataExchange");
await dataExchange.waitForDeployment();

console.log(`Contract:  ${await dataExchange.getAddress()}`);

//

const digest = `0x${hashDataset(FILE_PATH)}`;

console.log("\n1. off-chain dataset hashed and prepared");
console.log(`file:      ${FILE_PATH}`);
console.log(`uri:       ${DATASET_URI}`);
console.log(`digest:    ${digest}`);

//###
async function releaseDataset(
    datasetId: bigint,
    buyerAddress: string,
    srcPath: string,
    destPath: string
): Promise<void> {
    const approved = await dataExchange.hasAccess(datasetId, buyerAddress);

    if (!approved) { 
        throw new Error("Release denied: buyer not approved.");
    }
    
    mkdirSync(dirname(destPath), { recursive: true});
    copyFileSync(srcPath, destPath);
}
//###



const registrationTx = await dataExchange.connect(seller).registerDataset(DATASET_URI, digest);

const registrationReceipt = await registrationTx.wait();

const datasetId = 0n;
const dataset = await dataExchange.getDataset(datasetId);

console.log("\n2. dataset registered on-chain");
console.log(`owner:             ${dataset.owner}`);
console.log(`stored uri:        ${dataset.uri}`);
console.log(`digest:            ${dataset.digest}`);
console.log(`gas used (units):  ${registrationReceipt?.gasUsed}`);

//

const accessBeforeRequest = await dataExchange.hasAccess(datasetId, buyer.address);

console.log("\n3. buyer prepares to request access");
console.log(`access before request: ${accessBeforeRequest}`);

//

const requestTx = await dataExchange.connect(buyer).requestAccess(datasetId);

const requestReceipt = await requestTx.wait();

const request = await dataExchange.getRequest(datasetId, buyer.address);

console.log("\n4. buyer requested access");
console.log(`request asker:     ${request.buyer}`);
console.log(`request status:    ${request.status}`);
console.log(`gas used (units):  ${requestReceipt?.gasUsed}`);


console.log("\n5. unauthorised delivery attempt");
try {
    await releaseDataset(datasetId, buyer.address, FILE_PATH, deliveredFilePath);
    console.log("BAD: dataset released");
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(message);
}

//

const accessBeforeApproval = await dataExchange.hasAccess(datasetId, buyer.address);
console.log(`access granted:    ${accessBeforeApproval}`);

const approvalTx = await dataExchange.connect(seller).approveAccess(datasetId, buyer.address);
const approvalReceipt = await approvalTx.wait();

const accessAfterApproval = await dataExchange.hasAccess(datasetId, buyer.address);

console.log("\n6. seller approved access");
console.log(`buyer:             ${buyer.address}`);
console.log(`access granted:    ${accessAfterApproval}`);
console.log(`gas used (units):  ${approvalReceipt?.gasUsed}`);

//

await releaseDataset(datasetId, buyer.address, FILE_PATH, deliveredFilePath);

console.log("\n7. off-chain dataset released");
console.log(`delivered to:  ${deliveredFilePath}`);

//

const deliveryTx = await dataExchange.connect(seller).recordDelivery(datasetId, buyer.address);

const deliveryReceipt = await deliveryTx.wait();

const deliveryRecorded = await dataExchange.isDelivered(datasetId, buyer.address);

console.log("\n8. delivery recorded on-chain.");
console.log(`delivery recorded: ${deliveryRecorded}`);
console.log(`gas used (units):  ${deliveryReceipt?.gasUsed}`);

//

const receivedDigest = `0x${hashDataset(deliveredFilePath)}`;

const validDataset = await dataExchange.verifyDigest(datasetId, receivedDigest);

console.log("\n9. buyer verifies received dataset");
console.log(`registered digest: ${digest}`);
console.log(`received digest:   ${receivedDigest}`);
console.log(`integrity valid:   ${validDataset}`);

//

copyFileSync(deliveredFilePath, tamperedFilePath);
// fake data time:temperature
appendFileSync(tamperedFilePath, "\n1377299999, 99.99");

const tamperedDigest = `0x${hashDataset(tamperedFilePath)}`;
const tamperedDatasetValid = await dataExchange.verifyDigest(datasetId, tamperedDigest);

console.log("\n10. tampered dataset verification");
console.log(`registered digest: ${digest}`);
console.log(`tampered digest:   ${tamperedDigest}`);
console.log(`integrity valid:   ${tamperedDatasetValid}`);