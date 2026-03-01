import { expect } from "chai";
import { network } from "hardhat";
import { MerkleTree } from "merkletreejs";
import { keccak256 } from "ethers";


const { ethers } = await network.connect();

function generateSecretKeys(amount: number) {
    const secretKeys = [];
    for (let i = 0; i < amount; i++) {
        secretKeys.push(ethers.hexlify(ethers.randomBytes(32)))
    }

    const leaves = secretKeys.map(key => keccak256(ethers.toUtf8Bytes(key)))

    const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = merkleTree.getHexRoot();

    const keyWithProofs = secretKeys.map((key, index) => ({
        secretKey: key,
        leaf: leaves[index],
        proof: merkleTree.getHexProof(leaves[index])
    }));

    return { merkleTree, merkleRoot, leaves, keyWithProofs, secretKeys }
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

        return { owner, admin, artist, collector, collector2, artworkRegistry, artworkTokenization }
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

        it("Should deploy ArtworkRegistery with correct owner", async function () {
            expect(await artworkRegistry.owner()).to.equal(await owner.getAddress());
        })

        it("Should set owner as an admin automaticaly", async function () {
            expect(await artworkRegistry.admins(await owner.getAddress())).to.equal(true);
        })

        it("Should link ArtworkRegistery contract correctly", async function () {
            expect(await artworkRegistry.artworkTokenization()).to.equal(await artworkTokenization.getAddress());
        })
    })

    describe("Administration", function () {
        it("Should add a new admin", async function () {
            const adminAddress = admin.getAddress();
            await artworkRegistry.addAdmin(adminAddress);
            expect(await artworkRegistry.isAdmin(adminAddress)).to.equal(true);
        })

        it("Should not allow non-owner to add a new admin", async function () {
            const adminAddress = admin.getAddress();
            await expect(artworkRegistry.connect(artist).addAdmin(adminAddress)).to.revertedWithCustomError(artworkRegistry, "OwnableUnauthorizedAccount");
        })

        it("Should allow multiple admins", async function () {
            await artworkRegistry.addAdmin(admin.getAddress());
            await artworkRegistry.addAdmin(artist.getAddress());
            expect(await artworkRegistry.isAdmin(admin.getAddress())).to.equal(true);
            expect(await artworkRegistry.isAdmin(artist.getAddress())).to.equal(true);
        })
    })

    describe("Authorization", function () {
        beforeEach(async function () {
            await artworkRegistry.addAdmin(admin.getAddress());
        })

        it("Should authorize an artist", async function () {
            const artistAddress = artist.getAddress();
            await artworkRegistry.connect(admin).authorizeArtist(artistAddress, true);
            const artistAuthorized = await artworkRegistry.getArtist(artistAddress);
            expect(artistAuthorized.authorized).to.equal(true);
        })

        it("Should not allow a non-admin to authorize an artist", async function () {
            await expect(artworkRegistry.connect(collector).authorizeArtist(artist.getAddress(), true))
                .to.revertedWithCustomError(artworkRegistry, "OnlyAdminAuthorized");
        })

        it("Should prevent of duplicate authorization", async function () {
            const artistAddress = artist.getAddress();

            await artworkRegistry.connect(admin).authorizeArtist(artist, true);

            await expect(artworkRegistry.connect(admin).authorizeArtist(artist, true)).to.revertedWithCustomError(artworkRegistry, "AuthorizationAlreadyApplied");
        })

        it("Should allow a admin to revoke artist authorization", async function () {
            const artistAddress = artist.getAddress();

            await artworkRegistry.connect(admin).authorizeArtist(artistAddress, true);

            await expect(artworkRegistry.connect(admin).authorizeArtist(artistAddress, false)).to.emit(artworkRegistry, "AuthorizationArtist").withArgs(artistAddress, false);

            const artistData = await artworkRegistry.getArtist(artistAddress);

            expect(artistData.authorized).to.equal(false);
        })
    })

    describe("Artists", function () {
        const fakeCID = "QmYwAPJzv5CZsnANOTaREALcidButCorrectLengthForTest"

        it("Should set artist info", async function () {

            await artworkRegistry.connect(owner).addAdmin(admin.getAddress());
            await artworkRegistry.connect(admin).authorizeArtist(artist.getAddress(), true);
            await artworkRegistry.connect(artist).setArtistInfo(fakeCID);

            const newArtist = await artworkRegistry.getArtist(artist.getAddress());

            expect(newArtist.metadata).to.equal(fakeCID);
        })

        it("Should not allow non-authorized artist to set artist info", async function () {
            await expect(artworkRegistry.connect(artist).setArtistInfo(fakeCID)).to.revertedWithCustomError(artworkRegistry, "ArtistNotAuthorized");
        })
    })

    describe("Artwork Editions", function () {
        const fakeCID = "QmYwAPJzv5CZsnANOTaREALcidButCorrectLengthForTest";

        beforeEach(async function () {
            await artworkRegistry.connect(owner).addAdmin(admin.getAddress());
            await artworkRegistry.connect(admin).authorizeArtist(artist.getAddress(), true);
            await artworkRegistry.connect(artist).setArtistInfo(fakeCID);

        })

        it("Should create an artwork edition", async function () {
            const edition = generateSecretKeys(5);

            // Artist must approve ArtworkRegistry to transfer certificates
            await artworkTokenization.connect(artist).setApprovalForAll(await artworkRegistry.getAddress(), true);

            await expect(artworkRegistry.connect(artist).createArtworkEdition(fakeCID, 10, edition.merkleRoot))
                .to.emit(artworkRegistry, "NewArtworkEdition")
                .withArgs(await artist.getAddress(), 1);

            const artworkEdition = await artworkRegistry.getArtworkEdition(1);

            expect(artworkEdition.metadata).to.equal(fakeCID);
            expect(artworkEdition.merkleRoot).to.equal(edition.merkleRoot);
        })

        it("Should not allow non-authorized artist to create an artwork edition", async function () {
            const edition = generateSecretKeys(5);

            await artworkRegistry.connect(admin).authorizeArtist(artist.getAddress(), false);

            await artworkTokenization.connect(artist).setApprovalForAll(await artworkRegistry.getAddress(), true);

            await expect(artworkRegistry.connect(artist).createArtworkEdition(fakeCID, 10, edition.merkleRoot)).to.revertedWithCustomError(artworkRegistry, "ArtistNotAuthorized");
        })

        it("Should allow to set multiple artwork editions", async function () {
            const edition1 = generateSecretKeys(5);
            const edition2 = generateSecretKeys(5);

            await artworkTokenization.connect(artist).setApprovalForAll(await artworkRegistry.getAddress(), true);

            await expect(artworkRegistry.connect(artist).createArtworkEdition(fakeCID, 10, edition1.merkleRoot))
                .to.emit(artworkRegistry, "NewArtworkEdition")
                .withArgs(await artist.getAddress(), 1);

            await expect(artworkRegistry.connect(artist).createArtworkEdition(fakeCID, 20, edition2.merkleRoot))
                .to.emit(artworkRegistry, "NewArtworkEdition")
                .withArgs(await artist.getAddress(), 2);

            const artworkEdition1 = await artworkRegistry.getArtworkEdition(1);
            const artworkEdition2 = await artworkRegistry.getArtworkEdition(2);

            expect(artworkEdition1.metadata).to.equal(fakeCID);
            expect(artworkEdition1.merkleRoot).to.equal(edition1.merkleRoot);
            expect(artworkEdition2.metadata).to.equal(fakeCID);
            expect(artworkEdition2.merkleRoot).to.equal(edition2.merkleRoot);
        })
    })

    describe("Certificate Claiming", function () {
        let edition: any;
        let editionId: any;

        const fakeCID = "QmYwAPJzv5CZsnANOTaREALcidButCorrectLengthForTest"

        beforeEach(async function () {
            edition = generateSecretKeys(5);
            editionId = 1;

            await artworkRegistry.addAdmin(admin.getAddress());
            await artworkRegistry.connect(admin).authorizeArtist(artist.getAddress(), true);
            await artworkTokenization.connect(artist).setApprovalForAll(artworkRegistry.getAddress(), true);
            await artworkRegistry.connect(artist).createArtworkEdition(fakeCID, 5, edition.merkleRoot);

        })

        it("Should allow to claim a certificate with valid proof", async function () {
            const keyData = edition.keyWithProofs[0];

            await expect(artworkRegistry.connect(collector).claimCertificate(editionId, keyData.secretKey, keyData.proof))
                .to.emit(artworkRegistry, "CertificateClaimed")
                .withArgs(collector.getAddress(), editionId);

            const collectorBalance = await artworkTokenization.balanceOf(collector.getAddress(), editionId);
            expect(collectorBalance).to.equal(1);

            const isClaimed = await artworkRegistry.isKeyClaimed(editionId, keyData.secretKey);
            expect(isClaimed).to.equal(true);
        })

        it("Should not allow to claim a certificate with invalid proof", async function () {
            const keyData = edition.keyWithProofs[0];
            const invalidProof = edition.keyWithProofs[1].proof; // Using proof from another key

            await expect(artworkRegistry.connect(collector).claimCertificate(editionId, keyData.secretKey, invalidProof)).to.revertedWithCustomError(artworkRegistry, "InvalidMerkleProof");
        })

        it("Should not allow to claim a certificate with already claimed key", async function () {
            const keyData = edition.keyWithProofs[0];

            await artworkRegistry.connect(collector).claimCertificate(editionId, keyData.secretKey, keyData.proof);

            await expect(artworkRegistry.connect(collector2).claimCertificate(editionId, keyData.secretKey, keyData.proof)).to.revertedWithCustomError(artworkRegistry, "KeyAlreadyClaimed");
        })

        it("Should not allow to claim a certificate for non-existing edition", async function () {
            const keyData = edition.keyWithProofs[0];
            const nonExistingEditionId = 999;

            await expect(artworkRegistry.connect(collector).claimCertificate(nonExistingEditionId, keyData.secretKey, keyData.proof)).to.revertedWithCustomError(artworkRegistry, "EditionDoesNotExist");
        })

        it("Should not allow to claim when all certificates are claimed", async function () {

            for (let i = 0; i < edition.keyWithProofs.length; i++) {
                const keyData = edition.keyWithProofs[i];
                await artworkRegistry.connect(collector).claimCertificate(editionId, keyData.secretKey, keyData.proof);
            }

            const remainingBalance = await artworkTokenization.balanceOf(artist.getAddress(), editionId);
            expect(remainingBalance).to.equal(0);

            const newKeyData = generateSecretKeys(1).keyWithProofs[0];

            await expect(artworkRegistry.connect(collector2).claimCertificate(editionId, newKeyData.secretKey, newKeyData.proof)).to.revertedWithCustomError(artworkRegistry, "NoCertificateLeft");

        })

        it("Should not allow to claim a certificate with a invalid key", async function () {
            const invalidKey = ethers.hexlify(ethers.randomBytes(32));
            const validProof = edition.keyWithProofs[0].proof;

            await expect(artworkRegistry.connect(collector).claimCertificate(editionId, invalidKey, validProof)).to.revertedWithCustomError(artworkRegistry, "InvalidMerkleProof");
        })
    })

    describe("Reviews", function () {
        let editionId: number;
        let edition: any;
        const fakeCID = "QmYwAPJzv5CZsnANOTaREALcidButCorrectLengthForTest"

        beforeEach(async function () {
            edition = generateSecretKeys(5);
            editionId = 1;

            await artworkRegistry.addAdmin(admin.getAddress());
            await artworkRegistry.connect(admin).authorizeArtist(artist.getAddress(), true);
            await artworkTokenization.connect(artist).setApprovalForAll(artworkRegistry.getAddress(), true);
            await artworkRegistry.connect(artist).createArtworkEdition(fakeCID, 5, edition.merkleRoot);
        })

        it("Should allow to add a review to an artwork edition", async function () {
            const keyData = edition.keyWithProofs[0];
            await artworkRegistry.connect(collector).claimCertificate(editionId, keyData.secretKey, keyData.proof);

            const fakeCID = "QmYwAPJzv5CZsnANOTaREALcidButCorrectLengthForTest";
            await expect(artworkRegistry.connect(collector).addReview(editionId, 5, fakeCID))
                .to.emit(artworkRegistry, "NewReview")
                .withArgs(await collector.getAddress(), editionId, 5);

            const reviews = await artworkRegistry.getEditionReviews(editionId, 0, 99);
            expect(reviews.length).to.equal(1);
            expect(reviews[0].collector).to.equal(await collector.getAddress());
            expect(reviews[0].editionId).to.equal(editionId);
            expect(reviews[0].rating).to.equal(5);
            expect(reviews[0].metadata).to.equal(fakeCID);
        })

        it("Should not allow to add a review without owning a certificate", async function () {
            const fakeCID = "QmYwAPJzv5CZsnANOTaREALcidButCorrectLengthForTest";
            await expect(artworkRegistry.connect(collector).addReview(editionId, 5, fakeCID)).to.revertedWithCustomError(artworkRegistry, "NotAllowedToReview");
        })

        it("Should not allow to add a review with invalid rating", async function () {
            const keyData = edition.keyWithProofs[0];
            await artworkRegistry.connect(collector).claimCertificate(editionId, keyData.secretKey, keyData.proof);

            const fakeCID = "QmYwAPJzv5CZsnANOTaREALcidButCorrectLengthForTest";
            await expect(artworkRegistry.connect(collector).addReview(editionId, 6, fakeCID)).to.revertedWithCustomError(artworkRegistry, "RatingOutOfRange");
        })

        it("Should not allow to add three reviews from the same collector", async function () {
            const keyData = edition.keyWithProofs[0];
            await artworkRegistry.connect(collector).claimCertificate(editionId, keyData.secretKey, keyData.proof);

            const fakeCID = "QmYwAPJzv5CZsnANOTaREALcidButCorrectLengthForTest";
            await artworkRegistry.connect(collector).addReview(editionId, 5, fakeCID);
            await artworkRegistry.connect(collector).addReview(editionId, 4, fakeCID);
            await expect(artworkRegistry.connect(collector).addReview(editionId, 3, fakeCID)).to.revertedWithCustomError(artworkRegistry, "ReviewLimitReached");
        })
    })

    describe("ArtworkTokenization Contract", function () {
        let edition: any;
        let editionId: number;
        const fakeCID = "QmYwAPJzv5CZsnANOTaREALcidButCorrectLengthForTest";

        beforeEach(async function () {
            edition = generateSecretKeys(5);
            editionId = 1;

            await artworkRegistry.addAdmin(admin.getAddress());
            await artworkRegistry.connect(admin).authorizeArtist(artist.getAddress(), true);
            await artworkTokenization.connect(artist).setApprovalForAll(artworkRegistry.getAddress(), true);
            await artworkRegistry.connect(artist).createArtworkEdition(fakeCID, 5, edition.merkleRoot);
        })

        it("Should return the correct URI for tokens", async function () {
            const tokenURI = await artworkTokenization.uri(editionId);
            expect(tokenURI).to.equal(fakeCID);
        })

        it("Should return the correct balance for collectors", async function () {
            const keyData = edition.keyWithProofs[0];
            await artworkRegistry.connect(collector).claimCertificate(editionId, keyData.secretKey, keyData.proof);

            const balance = await artworkTokenization.balanceOf(collector.getAddress(), editionId);
            expect(balance).to.equal(1);
        })

        it("Should track token artists correctly", async function () {
            const tokenArtist = await artworkTokenization.tokenArtist(editionId);
            expect(tokenArtist).to.equal(await artist.getAddress());
        })

        it("Should not allow direct minting of tokens (only through ArtworkRegistry", async function () {
            await expect(artworkTokenization.connect(artist).mintArtworkEdition(artist.getAddress(), 5, "")).to.revertedWithCustomError(artworkTokenization, "OwnableUnauthorizedAccount");
        })
    })

    describe("Advanced Cases", function () {
        beforeEach(async function () {
            await artworkRegistry.addAdmin(admin.getAddress());
            await artworkRegistry.connect(admin).authorizeArtist(artist.getAddress(), true);
            await artworkTokenization.connect(artist).setApprovalForAll(await artworkRegistry.getAddress(), true);
            await artworkRegistry.connect(artist).setArtistInfo("QmYwAPJzv5CZsnANOTaREALcidButCorrectLengthForTest");
        })

        it("Should be gas efficient when creating an artwork edition with many certificates (10000)", async function () {
            const edition = generateSecretKeys(10000);
            const tx = await artworkRegistry.connect(artist).createArtworkEdition("QmYwAPJzv5CZsnANOTaREALcidButCorrectLengthForTest", 1000, edition.merkleRoot);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed;
            
            expect(gasUsed).to.be.lessThan(300000);
        })

        it("Should handle artist transfering certificates manually", async function () {
            const edition = generateSecretKeys(5);
            const editionId = 1;

            await artworkRegistry.connect(artist).createArtworkEdition("QmYwAPJzv5CZsnANOTaREALcidButCorrectLengthForTest", 5, edition.merkleRoot);

            await artworkTokenization.connect(artist).safeTransferFrom(
                artist.getAddress(),
                collector.getAddress(),
                editionId,
                1,
                "0x"
            );

            const balance = await artworkTokenization.balanceOf(collector.getAddress(), editionId);
            expect(balance).to.equal(1);
        })
    })
})