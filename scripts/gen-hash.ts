import { hashDataset } from "./utils/crypto.js";

const FILE_PATH = "evaluation_data/ciciot2023_sample.csv";
const digest = hashDataset(FILE_PATH);

console.log(`Dataset: ${FILE_PATH}`);
console.log(`SHA-256: 0x${digest}`);