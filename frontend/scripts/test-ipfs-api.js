#!/usr/bin/env node

/**
 * IPFS API test script
 * Usage: node test-ipfs-api.js
 */

const IPFS_RPC = process.env.IPFS_RPC || "https://ipfs-api.web3pi.link";

console.info("🧪 Testing the IPFS API\n");
console.info(`📡 API URL: ${IPFS_RPC}\n`);

// Test 1: Verify that the API responds
async function testApiConnection() {
    console.info("1️⃣ Testing connection to the API...");
    try {
        const response = await fetch(`${IPFS_RPC}/api/v0/version`, {
            method: 'POST',
        });
        
        if (response.ok) {
            const data = await response.json();
            console.info("   ✅ Connection successful!");
            console.info(`   📦 IPFS Version: ${data.Version || 'N/A'}`);
            return true;
        } else {
            console.error(`   ❌ Error: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.error(`   ❌ Connection error: ${error.message}`);
        return false;
    }
}

// Test 2: Add a test file
async function testAddFile() {
    console.info("\n2️⃣ Testing file add...");
    try {
        const testContent = JSON.stringify({
            test: true,
            message: "Test IPFS Kigen",
            timestamp: new Date().toISOString()
        });

        const formData = new FormData();
        const blob = new Blob([testContent], { type: 'application/json' });
        formData.append('file', blob, 'test.json');

        const response = await fetch(`${IPFS_RPC}/api/v0/add`, {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            console.info("   ✅ File added successfully!");
            console.info(`   📝 IPFS Hash: ${data.Hash || data.hash}`);
            console.info(`   🔗 URL: https://ipfs.io/ipfs/${data.Hash || data.hash}`);
            return data.Hash || data.hash;
        } else {
            const text = await response.text();
            console.error(`   ❌ Error: ${response.status} ${response.statusText}`);
            console.info(`   📄 Response: ${text}`);
            return null;
        }
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        return null;
    }
}

// Test 3: Retrieve a file
async function testGetFile(hash) {
    if (!hash) {
        console.info("\n3️⃣ Fetch test skipped (no hash)");
        return;
    }

    console.info("\n3️⃣ Testing file retrieval...");
    try {
        // Try via local API
        const response = await fetch(`${IPFS_RPC}/api/v0/cat?arg=${hash}`, {
            method: 'POST',
        });

        if (response.ok) {
            const content = await response.text();
            console.info("   ✅ File retrieved!");
            console.info(`   📄 Content: ${content}`);
        } else {
            console.warn(`   ⚠️  Local API retrieval failed (${response.status})`);
            console.info("   💡 Try via public gateway: https://ipfs.io/ipfs/" + hash);
        }
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
    }
}

// Run all tests
async function runTests() {
    const isConnected = await testApiConnection();
    
    if (isConnected) {
        const hash = await testAddFile();
        await testGetFile(hash);
    }

    console.info("\n" + "=".repeat(50));
    console.info("✅ Tests completed!");
    console.info("=".repeat(50));
}

// Run tests
runTests().catch(console.error);
