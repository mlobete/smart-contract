import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("owner request approval", async function () {
    let dataExchange: any;
    let seller: any;
    let buyer: any;
    let other: any;

    const mockMetadataURI = "/datasets/metadata/test.json";
    const mockDigest = "0xec864fe99b539704b8872ac591067ef22d836a8d942087f2dba274b301ebe6e5";

    const STATUS_APPROVED = 1n;

    beforeEach(async function () {
        dataExchange = await ethers.deployContract("DataExchange");
        [seller, buyer, other] = await ethers.getSigners();

        await dataExchange.connect(seller).registerDataset(mockMetadataURI, mockDigest);

        await dataExchange.connect(buyer).requestAccess(0);
    });

    it("owner approves access and is set", async function () {
        await dataExchange.connect(seller).approveAccess(0, buyer.address);
        const request = await dataExchange.getRequest(0, buyer.address);
        expect(request.status).to.equal(STATUS_APPROVED);
    });

    it("approval enables hasAccess", async function () {
        await dataExchange.connect(seller).approveAccess(0, buyer.address);

        expect(await dataExchange.hasAccess(0, buyer.address)).to.equal(true);
    });
    
    it("emits AccessApproved", async function () {
        const tx = await dataExchange.connect(seller).approveAccess(0, buyer.address);

        await expect(tx).to.emit(dataExchange, "AccessApproved").withArgs(0n, buyer.address, seller.address);
    });

    it("non-owner cannot approve", async function () {
        await expect(dataExchange.connect(other).approveAccess(0, buyer.address)).to.revert(ethers);
    });

    it("cannot approve nonexistent request", async function () {
        await expect(dataExchange.connect(seller).approveAccess(0, other.address)).to.revert(ethers);
    });

    it("cannot approve rejected request", async function () {
        await dataExchange.connect(seller).rejectAccess(0, buyer.address);

        await expect(dataExchange.connect(seller).approveAccess(0, buyer.address)).to.revert(ethers);
    });
});