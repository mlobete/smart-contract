import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("dataset access checks", function () {
    let dataExchange: any;
    let seller: any;
    let buyer: any;
    let other: any;

    const mockMetadataURI = "/datasets/metadata/test.json";
    const mockDigest = "0xec864fe99b539704b8872ac591067ef22d836a8d942087f2dba274b301ebe6e5";

    beforeEach(async function () {
        dataExchange = await ethers.deployContract("DataExchange");
        [seller, buyer, other] = await ethers.getSigners();

        await dataExchange.connect(seller).registerDataset(mockMetadataURI, mockDigest);

        await dataExchange.connect(buyer).requestAccess(0);
    });

    it("hasAccess false before approval", async function () {
        expect(await dataExchange.hasAccess(0, buyer.address)).to.equal(false);
    });

    it("hasAccess is true after approval", async function () {
        await dataExchange.connect(seller).approveAccess(0, buyer.address);

        expect(await dataExchange.hasAccess(0, buyer.address)).to.equal(true);
    });

    it("hasAccess is false for other users", async function () {
        await dataExchange.connect(seller).approveAccess(0, buyer.address);

        expect(await dataExchange.hasAccess(0, other.address)).to.equal(false);
    });
});