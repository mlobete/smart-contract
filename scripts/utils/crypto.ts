import { createHash } from "node:crypto";
import * as fs from "node:fs";

// calculates sha-256 hash
export function hashDataset(filePath: string): string {
    const bytes: Buffer = fs.readFileSync(filePath);
    return createHash("sha256").update(bytes).digest("hex");
}