import { BrowserProvider, Contract } from "https://cdn.jsdelivr.net/npm/ethers@6.17.0/+esm";

const CONTRACT_ADDRESS = "0x87aBE574f7b093a98714F7707c5C7BC952BCf5f4";
const SEPOLIA_CHAIN_ID = 11155111n;
const SEPOLIA_HEX = "0xaa36a7";

const ABI = [
  "function registerDataset(string uri, string digest)",
  "function requestAccess(uint256 datasetId)",
  "function approveAccess(uint256 datasetId, address buyer)",
  "function hasAccess(uint256 datasetId, address buyer) view returns (bool)",
  "function getDataset(uint256 datasetId) view returns (address owner, string uri, string digest)",
];

const ethereum = window.ethereum;

let busy = false;
let connected = false;
let onSepolia = false;

const byId = (id) => document.getElementById(id);
const input = (id) => byId(id).value.trim();

function show(message) {
  byId("message").textContent = message;
}

function explain(error) {
  return error.shortMessage || error.reason || error.message || "Operation failed.";
}

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function sha256(file) {
  const bytes = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(
    new Uint8Array(hash),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function updateButtons() {
  document.querySelectorAll(".write").forEach((button) => {
    button.disabled = !connected || !onSepolia || busy;
  });

  byId("connect").disabled = busy;
  byId("switch").disabled = busy;
}

async function getProvider() {
  if (!ethereum) throw new Error("MetaMask was not found.");
  return new BrowserProvider(ethereum);
}

async function getContract(write = false) {
  const provider = await getProvider();

  if (!write) {
    return new Contract(CONTRACT_ADDRESS, ABI, provider);
  }

  if ((await provider.getNetwork()).chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error("Switch MetaMask to Ethereum Sepolia.");
  }

  return new Contract(CONTRACT_ADDRESS, ABI, await provider.getSigner());
}

async function refreshWallet() {
  if (!ethereum) {
    show("MetaMask was not found.");
    updateButtons();
    return;
  }

  const provider = await getProvider();
  const [account] = await provider.send("eth_accounts", []);

  connected = Boolean(account);
  onSepolia = (await provider.getNetwork()).chainId === SEPOLIA_CHAIN_ID;

  byId("account").textContent = account
    ? `${shortAddress(account)}${onSepolia ? " (Sepolia)" : " (wrong network)"}`
    : "";

  byId("connect").textContent = "Connect MetaMask";
  byId("switch").hidden = !connected || onSepolia;

  updateButtons();
}

async function sendTransaction(label, action) {
  try {
    busy = true;
    updateButtons();

    show("Confirm the transaction in MetaMask.");
    const transaction = await action(await getContract(true));

    show("Waiting for confirmation.");
    await transaction.wait();

    show(`${label} confirmed.`);
  } catch (error) {
    show(explain(error));
  } finally {
    busy = false;
    updateButtons();
  }
}

byId("connect").addEventListener("click", async () => {
  try {
    await ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });

    await (await getProvider()).send("eth_requestAccounts", []);
    await refreshWallet();

    show("Wallet connected.");
  } catch (error) {
    show(explain(error));
  }
});

byId("switch").addEventListener("click", async () => {
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_HEX }],
    });

    await refreshWallet();
    show("Switched to Ethereum Sepolia.");
  } catch (error) {
    show(explain(error));
  }
});

byId("register-form").addEventListener("submit", (event) => {
  event.preventDefault();

  void sendTransaction("Dataset registration", (contract) =>
    contract.registerDataset(input("uri"), input("digest")),
  );
});

byId("register-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    show("Calculating SHA-256 digest.");
    byId("digest").value = await sha256(file);
    show("SHA-256 digest calculated.");
  } catch (error) {
    byId("digest").value = "";
    show(explain(error));
  }
});

byId("request-form").addEventListener("submit", (event) => {
  event.preventDefault();

  void sendTransaction("Access request", (contract) =>
    contract.requestAccess(BigInt(input("request-id"))),
  );
});

byId("approval-form").addEventListener("submit", (event) => {
  event.preventDefault();

  void sendTransaction("Access approval", (contract) =>
    contract.approveAccess(
      BigInt(input("approval-id")),
      input("approval-buyer"),
    ),
  );
});

byId("check-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const result = byId("access-result");

  try {
    busy = true;
    updateButtons();

    const hasAccess = await (await getContract()).hasAccess(
      BigInt(input("check-id")),
      input("check-buyer"),
    );
    result.textContent = `Has access: ${hasAccess}`;
    result.hidden = false;
    show("Access status loaded.");
  } catch (error) {
    result.hidden = true;
    show(explain(error));
  } finally {
    busy = false;
    updateButtons();
  }
});

byId("verify-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const result = byId("verify-result");
  const file = byId("verify-file").files[0];

  if (!file) {
    result.hidden = true;
    show("Choose the received dataset file first.");
    return;
  }

  try {
    busy = true;
    updateButtons();

    show("Calculating SHA-256 digest.");

    const calculatedDigest = await sha256(file);
    const dataset = await (await getContract()).getDataset(BigInt(input("verify-id")));

    result.textContent = calculatedDigest === dataset.digest
        ? "Integrity check: digest matches the registered dataset."
        : "Integrity check: digest does not match the registered dataset.";

    result.hidden = false;
    show("Integrity check completed.");
  } catch (error) {
    result.hidden = true;
    show(explain(error));
  } finally {
    busy = false;
    updateButtons();
  }
});

ethereum?.on?.("accountsChanged", () => void refreshWallet());
ethereum?.on?.("chainChanged", () => void refreshWallet());

void refreshWallet();