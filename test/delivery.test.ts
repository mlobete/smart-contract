import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("dataset delivery recording", async function () {
    let dataExchange: any;
    let seller: any ;
    let buyer: any;

    const mockMetadataURI = "/datasets/metadata/test.json";
    const mockDigest =
        "0xec864fe99b539704b8872ac591067ef22d836a8d942087f2dba274b301ebe6e5";

    beforeEach(async function () {
        dataExchange = await ethers.deployContract("DataExchange");
        [seller, buyer] = await ethers.getSigners();

        await dataExchange.connect(seller).registerDataset(mockMetadataURI, mockDigest);

        await dataExchange.connect(buyer).requestAccess(0);
    });

    it("records delivery after approval", async function () {
        await dataExchange.connect(seller).approveAccess(0, buyer.address);

        await dataExchange.connect(seller).recordDelivery(0, buyer.address);

        expect(await dataExchange.isDelivered(0, buyer.address)).to.equal(true);
    });

    it("blocks delivery before approval", async function () {
        await expect(dataExchange.connect(seller).recordDelivery(0, buyer.address)).to.revert(ethers);
    });

    it("non-owner cannot record delivery", async function () {
        await dataExchange.connect(seller).approveAccess(0, buyer.address);

        await expect(dataExchange.connect(buyer).recordDelivery(0, buyer.address)).to.revert(ethers);
    });
});
