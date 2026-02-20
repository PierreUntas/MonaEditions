import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ProductTraceSystemModule", (m) => {
    const productTokenization = m.contract("ProductTokenization", ["ipfs://"]);

    const productTraceStorage = m.contract("ProductTraceStorage", [productTokenization]);

    m.call(productTokenization, "transferOwnership", [productTraceStorage]);

    return { productTokenization, productTraceStorage };
});