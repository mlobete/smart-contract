import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("database has verification", function () {
    let dataExchange: any;
    let seller: any;
    let buyer: any;

    const mockMetadataURI = "/datasets/metadata/test.json";
    const mockDigest ="0xec864fe99b539704b8872ac591067ef22d836a8d942087f2dba274b301ebe6e5";
    const badDigest =
        "0x2f05d4b689d270cafb02285f35f44866f7dc8a2d368a3f9d1124373eeab31fb1";

    beforeEach(async function () {
        dataExchange = await ethers.deployContract("DataExchange");
        [seller, buyer] = await ethers.getSigners();

        await dataExchange.connect(seller).registerDataset(mockMetadataURI, mockDigest);
    });

    it("returns true for matching digest", async function () {
        expect(await dataExchange.connect(buyer).verifyDigest(0, mockDigest)).to.equal(true);
    });

    it("returns false for incorrect digest", async function () {
        expect(await dataExchange.connect(buyer).verifyDigest(0, badDigest)).to.equal(false);
    })

    it("reject nonexistent dataset", async function () {
        await expect(dataExchange.connect(buyer).verifyDigest(9999, mockDigest)).to.revert(ethers);
    });
});