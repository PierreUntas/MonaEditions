// Local IPFS usage examples for Kigen
// This file demonstrates how to upload and retrieve data

const IPFS_API = process.env.IPFS_RPC || "http://127.0.0.1:5001";

// Example 1: Upload a JSON object (artwork batch data)
async function uploadBatchData() {
    const batchData = {
        batchId: "BATCH-2026-001",
        producer: "Rucher des Abeilles Dorées",
        harvestDate: "2026-01-14",
        location: {
            latitude: 43.6047,
            longitude: 1.4442,
            address: "Toulouse, France"
        },
        artworkType: "Peinture à l'huile",
        quantity: 50, // kg
        certifications: ["Bio", "Label Rouge"],
        analyses: {
            humidity: 17.2,
            ph: 3.9,
            conductivity: 0.35
        },
        timestamp: new Date().toISOString()
    };

    console.info("📦 Uploading batch data...");
    
    const blob = new Blob([JSON.stringify(batchData, null, 2)], { 
        type: 'application/json' 
    });
    
    const formData = new FormData();
    formData.append('file', blob, `batch-${batchData.batchId}.json`);

    const response = await fetch(`${IPFS_API}/api/v0/add`, {
        method: 'POST',
        body: formData,
    });

    const result = await response.json();
    
    console.info("✅ Data uploaded successfully!");
    console.info(`📝 IPFS Hash: ${result.Hash}`);
    console.info(`🔗 Local URL: http://127.0.0.1:8080/ipfs/${result.Hash}`);
    console.info(`🌐 Public URL: https://ipfs.io/ipfs/${result.Hash}`);
    
    return result.Hash;
}

// Example 2: Retrieve data
async function getBatchData(hash) {
    console.info(`\n📥 Fetching data for hash: ${hash}`);
    
    const response = await fetch(`${IPFS_API}/api/v0/cat?arg=${hash}`, {
        method: 'POST',
    });

    const data = await response.json();
    
    console.info("✅ Data retrieved:");
    console.info(JSON.stringify(data, null, 2));
    
    return data;
}

// Example 3: Upload an image file (photo of the artwork)
async function uploadImage(imagePath) {
    const fs = require('fs');
    const FormData = require('form-data'); // Requires: npm install form-data
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath));

    const response = await fetch(`${IPFS_API}/api/v0/add`, {
        method: 'POST',
        body: formData,
    });

    const result = await response.json();
    
    console.info("✅ Image uploaded!");
    console.info(`🖼️  Hash: ${result.Hash}`);
    
    return result.Hash;
}

// Exemple 4: Upload avec métadonnées (NFT-style)
async function uploadBatchNFTMetadata() {
    const metadata = {
        name: "Peinture à l'huile - Batch #001",
        description: "Miel biologique récolté dans les champs de lavande de Provence",
        image: "ipfs://QmPreviousImageHash", // Hash d'une image déjà uploadée
        attributes: [
            { trait_type: "Type", value: "Peinture à l'huile" },
            { trait_type: "Origine", value: "Provence, France" },
            { trait_type: "Année", value: "2026" },
            { trait_type: "Certification", value: "Bio" },
            { trait_type: "Quantité (kg)", value: "50" }
        ],
        properties: {
            producer: "Rucher des Abeilles Dorées",
            harvestDate: "2026-01-14",
            batchId: "BATCH-2026-001"
        }
    };

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { 
        type: 'application/json' 
    });
    
    const formData = new FormData();
    formData.append('file', blob, 'metadata.json');

    const response = await fetch(`${IPFS_API}/api/v0/add`, {
        method: 'POST',
        body: formData,
    });

    const result = await response.json();
    
    console.info("✅ NFT metadata uploaded!");
    console.info(`📝 Hash: ${result.Hash}`);
    
    return result.Hash; 
}

// Lancer les exemples
async function main() {
    try {
        console.info("🐝 Kigen - IPFS examples\n");
        console.info("=".repeat(50));
        
        // Test 1: Upload batch data
        const hash = await uploadBatchData();
        
        // Test 2: Retrieve data
        await getBatchData(hash);
        
        // Test 3: NFT metadata
        console.info("\n" + "=".repeat(50));
        await uploadBatchNFTMetadata();
        
        console.info("\n" + "=".repeat(50));
        console.info("✅ All tests passed!");
        console.info("\n💡 Open the WebUI: http://127.0.0.1:5001/webui");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

// Exécuter si lancé directement
if (require.main === module) {
    main();
}

module.exports = {
    uploadBatchData,
    getBatchData,
    uploadImage,
    uploadBatchNFTMetadata
};
