import { hashDataset } from "./utils/crypto.js";

const FILE_PATH = "temperature.csv";
const digest = hashDataset(FILE_PATH);

console.log(`Dataset: ${FILE_PATH}`);
console.log(`SHA-256: ${digest}`);