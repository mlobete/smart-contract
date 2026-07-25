import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Buyer dataset requests", function () {
    let dataExchange: any;
    let buyer: any;
    let seller: any;
    const mockMetaDataURI = "/data/metadata/test.json";
    const mockDigest = "ec864fe99b539704b8872ac591067ef22d836a8d942087f2dba274b301ebe6e5";

    const DATASET_ID = 0n;
    const STATUS_PENDING = 0n;

    beforeEach(async function () {
        dataExchange = await ethers.deployContract("DataExchange");
        [seller, buyer] = await ethers.getSigners();
        await dataExchange.connect(seller).registerDataset(mockMetaDataURI, mockDigest);
    })

    it("allows dataset request", async function () {
        await dataExchange.connect(buyer).requestAccess(0);
        const request = await dataExchange.getRequest(0, buyer.address);
        expect(request.buyer).to.equal(buyer.address);
    });

    it("stores buyer", async function () {
        await dataExchange.connect(buyer).requestAccess(0);
        const request = await dataExchange.getRequest(0, buyer.address);
        expect(request.buyer).to.equal(buyer.address);
    });

    it("stores dataset ID", async function () {
        await dataExchange.connect(buyer).requestAccess(0);
        const request = await dataExchange.getRequest(0, buyer.address);
        // pending = 0, approve = 1, reject = 2
        expect(request.datasetId).to.equal(DATASET_ID);
    });

    it("starts pending", async function () {
        await dataExchange.connect(buyer).requestAccess(0);
        const request = await dataExchange.getRequest(0, buyer.address);
        // pending = 0;
        expect(request.status).to.equal(STATUS_PENDING);
    });

    it("emits AccessRequested", async function () {
        const tx = await dataExchange.connect(buyer).requestAccess(0);

        await expect(tx).to.emit(dataExchange, "AccessRequested").withArgs(0n, buyer.address);
    });

    it("rejects nonexistent dataset", async function () {
        await expect(dataExchange.connect(buyer).requestAccess(9999)).to.revert(ethers);
    });

    it("seller cannot request own dataset", async function () {
        await expect(dataExchange.connect(seller).requestAccess(0)).to.revert(ethers);
    });

    it("buyer cannot request twice", async function () {
        await dataExchange.connect(buyer).requestAccess(0);
        await expect(dataExchange.connect(buyer).requestAccess(0)).to.revert(ethers);
    });

});
