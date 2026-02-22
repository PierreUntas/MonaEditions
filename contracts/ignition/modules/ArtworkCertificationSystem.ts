import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ArtworkCertificationSystemModule", (m) => {
    const artworkTokenization = m.contract("ArtworkTokenization", ["ipfs://"]);

    const artworkRegistry = m.contract("ArtworkRegistry", [artworkTokenization]);

    m.call(artworkTokenization, "transferOwnership", [artworkRegistry]);

    return { artworkTokenization, artworkRegistry };
});