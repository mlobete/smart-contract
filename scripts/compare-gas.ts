import { artifacts, network } from "hardhat";
import { hashDataset } from "./utils/crypto.js";

const { ethers } = await network.create();
const [seller, buyer] = await ethers.getSigners();

const filePath = "evaluation_data/ciciot2023_sample.csv";
const uri = "local://ciciot2023_sample.csv";

const stringDigest = hashDataset(filePath);
const bytes32Digest = `0x${stringDigest}`;

async function gasUsed(transactionPromise: Promise<any>) {
    const transaction = await transactionPromise;
    const receipt = await transaction.wait();

    if (!receipt) {
        throw new Error("Transaction receipt was unavailable.");
    }

    return receipt.gasUsed;
}

async function deploymentGas(contract: any) {
    const transaction = contract.deploymentTransaction();

    if (!transaction) {
        throw new Error("Deployment transaction was unavailable.");
    }

    const receipt = await transaction.wait();

    if (!receipt) {
        throw new Error("Deployment receipt was unavailable.");
    }

    return receipt.gasUsed;
}

async function measureWorkflow(contract: any, digest: string) {
    // warmup so that the measured dataset identifiers begin at 1
    await gasUsed(contract.connect(seller).registerDataset("local://warmup.csv", digest));

    const register = await gasUsed(contract.connect(seller).registerDataset(uri, digest));
    const request = await gasUsed(contract.connect(buyer).requestAccess(1));
    const approve = await gasUsed(contract.connect(seller).approveAccess(1, buyer.address));
    const delivery = await gasUsed(contract.connect(seller).recordDelivery(1, buyer.address));

    // a separate request for the rejection measurement
    await gasUsed(contract.connect(seller).registerDataset(uri, digest));
    await gasUsed(contract.connect(buyer).requestAccess(2));

    const reject = await gasUsed(contract.connect(seller).rejectAccess(2, buyer.address));

    return {
        register: register,
        request: request,
        approve: approve,
        reject: reject,
        delivery: delivery,
    };
}

function comparisonRow(operation: string, baseline: bigint, optimised: bigint) {
    const saving = baseline - optimised;
    const reduction = (Number(saving) / Number(baseline)) * 100;

    return {
        operation: operation,
        baseline: baseline.toString(),
        optimised: optimised.toString(),
        saving: saving.toString(),
        reduction: `${reduction.toFixed(2)}%`,
    };
}

// deploy baseline contract and get its deployment gas
const baselineContract: any = await ethers.deployContract("DataExchangeBaseline");
const baselineDeployment = await deploymentGas(baselineContract);

// deploy optimised contract and get its deployment gas
const optimisedContract: any = await ethers.deployContract("DataExchange");
const optimisedDeployment = await deploymentGas(optimisedContract);

// run the same workflow against each contract
const baselineWorkflow = await measureWorkflow(baselineContract, stringDigest);
const optimisedWorkflow = await measureWorkflow(optimisedContract, bytes32Digest);

// compare every measured operation explicitly.
const gasComparison = [
    comparisonRow("deployment", baselineDeployment, optimisedDeployment),
    comparisonRow("register", baselineWorkflow.register, optimisedWorkflow.register),
    comparisonRow("request", baselineWorkflow.request, optimisedWorkflow.request),
    comparisonRow("approve", baselineWorkflow.approve, optimisedWorkflow.approve),
    comparisonRow("reject", baselineWorkflow.reject, optimisedWorkflow.reject),
    comparisonRow("delivery", baselineWorkflow.delivery, optimisedWorkflow.delivery),
];

console.table(gasComparison);

// read the compiled contract artifacts for the bytecode comparison
const baselineArtifact = await artifacts.readArtifact("DataExchangeBaseline");
const optimisedArtifact = await artifacts.readArtifact("DataExchange");

function bytecodeSize(bytecode: string) {
    return (bytecode.length - 2) / 2;
}

const bytecodeComparison = [
    {
        metric: "Creation bytecode",
        baseline: bytecodeSize(baselineArtifact.bytecode),
        optimised: bytecodeSize(optimisedArtifact.bytecode),
    },
    {
        metric: "Runtime bytecode",
        baseline: bytecodeSize(baselineArtifact.deployedBytecode),
        optimised: bytecodeSize(optimisedArtifact.deployedBytecode),
    },
];

console.table(bytecodeComparison);
