import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("complete dataset exchange workflows", function () {
    let dataExchange: any;
    let seller: any;
    let buyer: any;

    const mockMetadataURI = "/datasets/metadata/test.json";
    const mockDigest =
        "ec864fe99b539704b8872ac591067ef22d836a8d942087f2dba274b301ebe6e5";

    const STATUS_APPROVED = 1n;
    const STATUS_REJECTED = 2n;


    beforeEach(async function () {
        dataExchange = await ethers.deployContract("DataExchange");
        [seller, buyer] = await ethers.getSigners();
    });

    it("completes a successful exchange", async function () {
        await dataExchange.connect(seller).registerDataset(mockMetadataURI, mockDigest);

        await dataExchange.connect(buyer).requestAccess(0);

        await dataExchange.connect(seller).approveAccess(0, buyer.address);

        const request = await dataExchange.getRequest(0, buyer.address);
        expect(request.status).to.equal(STATUS_APPROVED);

        expect(await dataExchange.hasAccess(0, buyer.address)).to.equal(true);

        await dataExchange.connect(seller).recordDelivery(0, buyer.address);

        expect(await dataExchange.isDelivered(0, buyer.address)).to.equal(true);

        expect(await dataExchange.connect(buyer).verifyDigest(0, mockDigest)).to.equal(true);
    });

    it("blocks rejected exchange", async function () {
        await dataExchange.connect(seller).registerDataset(mockMetadataURI, mockDigest);

        await dataExchange.connect(buyer).requestAccess(0);

        await dataExchange.connect(seller).rejectAccess(0, buyer.address);

        const request = await dataExchange.getRequest(0, buyer.address);
        expect(request.status).to.equal(STATUS_REJECTED);
        
        expect(await dataExchange.hasAccess(0, buyer.address)).to.equal(false);

        await expect(dataExchange.connect(seller).recordDelivery(0, buyer.address)).to.revert(ethers);
    });
});