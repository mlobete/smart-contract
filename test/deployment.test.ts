import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("DataExchange deployment", function () { 
    it("deploys the contract", async function () {
        const dataExchange = await ethers.deployContract("DataExchange");

        //expect(dataExchange.target).to.not.equal(undefined);
        expect(dataExchange.target).to.exist;
    });

    it("starts with zero datasets", async function () {
        const dataExchange = await ethers.deployContract("DataExchange");

        expect(await dataExchange.getDatasetCount()).to.equal(0n);
    });
});
