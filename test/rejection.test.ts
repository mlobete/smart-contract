import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("owner request rejection", async function () {
    let dataExchange: any;
    let seller: any;
    let buyer: any;
    let other: any;

    const mockMetadataURI = "/datasets/metadata/test.json";
    const mockDigest = "ec864fe99b539704b8872ac591067ef22d836a8d942087f2dba274b301ebe6e5";

    const STATUS_PENDING = 0n;
    const STATUS_REJECTED = 2n;
    
    beforeEach(async function () {
        dataExchange = await ethers.deployContract("DataExchange");
        [seller, buyer, other] = await ethers.getSigners();

        await dataExchange.connect(seller).registerDataset(mockMetadataURI, mockDigest);

        await dataExchange.connect(buyer).requestAccess(0);
    });

    it("owner rejects access and is set", async function () {
        await dataExchange.connect(seller).rejectAccess(0, buyer.address);
        const request = await dataExchange.getRequest(0, buyer.address);
        expect(request.status).to.equal(STATUS_REJECTED);
    });

    it("rejetion keeps hasAccess false", async function () {
        await dataExchange.connect(seller).rejectAccess(0, buyer.address);

        expect(await dataExchange.hasAccess(0, buyer.address)).to.equal(false);
    });

    it("emits AccessRejected", async function () {
        const tx = await dataExchange.connect(seller).rejectAccess(0, buyer.address);

        await expect(tx).to.emit(dataExchange, "AccessRejected").withArgs(0n, buyer.address, seller.address);
    });

    it("non-owner cannot reject", async function () {
        await expect(dataExchange.connect(other).approveAccess(0, buyer.address)).to.revert(ethers);
    });

    it("cannot reject nonexistent request", async function () {
        await expect(dataExchange.connect(seller).approveAccess(0, other.address)).to.revert(ethers);
    });
});