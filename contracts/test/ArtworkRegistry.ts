import {expect} from "chai";
import {network} from "hardhat";
import {MerkleTree} from "merkletreejs";
import { keccak256 } from "ethers";


const {ethers} = await network.connect();

function generateSecretKeys(amount: number) {
    const secretKeys = [];
    for (let i = 0; i < amount; i++) {
        secretKeys.push(ethers.hexlify(ethers.randomBytes(32)))
    }
    console.log("secretKeys", secretKeys);

    const leaves = secretKeys.map(key => keccak256(ethers.toUtf8Bytes(key))) // ou ethers.getBytes(key)
    console.log("leaves", leaves);

    const merkleTree = new MerkleTree(leaves, keccak256, {sortPairs: true});
    const merkleRoot = merkleTree.getHexRoot();

    const keyWithProofs = secretKeys.map((key, index) => ({
        secretKey : key,
        leaf: leaves[index],
        proof: merkleTree.getHexProof(leaves[index])
    }));

    return {merkleTree, merkleRoot, leaves, keyWithProofs, secretKeys}
}

describe("ArtworkRegistry", function () {
    let owner: any;
    let admin: any;
    let artist: any;
    let collector: any;
    let collector2: any;
    let artworkRegistry: any;
    let artworkTokenization: any;

    async function deployArtworkRegistery() {
        const [owner, admin, artist, collector, collector2] = await ethers.getSigners();
        const ArtworkTokenization = await ethers.getContractFactory("ArtworkTokenization");
        const artworkTokenization = await ArtworkTokenization.deploy("");
        const artworkTokenizationAddress = artworkTokenization.getAddress();
        const artworkRegistry = await ethers.deployContract("ArtworkRegistry", [artworkTokenizationAddress]);

        await artworkTokenization.transferOwnership(await artworkRegistry.getAddress());

        return {owner, admin, artist, collector, collector2, artworkRegistry, artworkTokenization}
    }

    beforeEach(async function () {
        const deployment = await deployArtworkRegistery();
        owner = deployment.owner;
        admin = deployment.admin;
        artist = deployment.artist;
        collector = deployment.collector;
        collector2 = deployment.collector2;
        artworkRegistry = deployment.artworkRegistry;
        artworkTokenization = deployment.artworkTokenization;
    })

    describe("Deployment", function () {
        it("Should deploy the ArtworkRegistery contract", async function () {
            expect(await artworkTokenization.owner()).to.equal(await artworkRegistry.getAddress());
        })

        it("Should deploy ArtworkRegistery with correct owner", async function() {
            expect(await artworkRegistry.owner()).to.equal(await owner.getAddress());
        })

        it("Should set owner as an admin automaticaly", async function () {
            expect(await artworkRegistry.admins(await owner.getAddress())).to.equal(true);
        })

        it("Should link ArtworkRegistery contract correctly", async function() {
            expect(await artworkRegistry.artworkTokenization()).to.equal(await artworkTokenization.getAddress());
        })
    })
})
