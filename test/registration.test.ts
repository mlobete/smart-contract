import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Seller dataset registration", function () {
    let dataExchange: any;
    let seller: any;
    const mockMetadataURI = "/datasets/metadata/test.json";
    const mockDigest = "0xec864fe99b539704b8872ac591067ef22d836a8d942087f2dba274b301ebe6e5";

    beforeEach(async function () {
        dataExchange = await ethers.deployContract("DataExchange");
        [seller] = await ethers.getSigners();
    });

    // TODO: change storage
    it("registers a dataset", async function () {
        await dataExchange.connect(seller).registerDataset(mockMetadataURI, mockDigest);
        expect(await dataExchange.getDatasetCount()).to.equal(1n);
    });

    it("stores seller as owner", async function () {
        await dataExchange.connect(seller).registerDataset(mockMetadataURI, mockDigest);
        const dataset = await dataExchange.getDataset(0);
        expect(dataset.owner).to.equal(seller.address);
    });

    it("stores the metadata URI", async function () {
        await dataExchange.connect(seller).registerDataset(mockMetadataURI, mockDigest);
        const dataset = await dataExchange.getDataset(0);
        expect(dataset.uri).to.equal(mockMetadataURI);
    });

    it("stores the dataset digest", async function () {
        await dataExchange.connect(seller).registerDataset(mockMetadataURI, mockDigest);
        const dataset = await dataExchange.getDataset(0);
        expect(dataset.digest).to.equal(mockDigest);
    });


    it("emits on register", async function () {
        const tx = await dataExchange.connect(seller).registerDataset(mockMetadataURI, mockDigest);
        await expect(tx).to.emit(dataExchange, "DatasetRegistered")
            .withArgs(0, seller.address, mockMetadataURI, mockDigest);
    });

    it("increments the dataset id", async function () {
        const mockMetadataURI2 = "/datasets/metadata/test2.json"
        const mockDigest2 = "0xb37ed244c19de6a176fffe949d47a78d31998477e2e6d74ab11736e80fe56b74";
        await dataExchange.connect(seller).registerDataset(mockMetadataURI, mockDigest);
        await dataExchange.connect(seller).registerDataset(mockMetadataURI2, mockDigest2);
        expect(await dataExchange.getDatasetCount()).to.equal(2n);

        const mock1 = await dataExchange.getDataset(0);
        const mock2 = await dataExchange.getDataset(1);
        expect(mock1).to.exist;
        expect(mock2).to.exist;
    });

    it("rejects empty metadata URI", async function () {
        await expect(dataExchange.connect(seller).registerDataset("", mockDigest)).to.revert(ethers);
    });

    it("rejects empty digest", async function () {
        await expect(dataExchange.connect(seller).registerDataset(mockMetadataURI, ethers.ZeroHash)).to.revert(ethers);
    });
});

