// Configuration - use API proxy for uploads
const IPFS_API = '/api/ipfs';

// In-memory cache to avoid repeated requests
const ipfsCache = new Map<string, any>();

// Public IPFS gateway (fast and reliable)
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

export async function uploadToIPFS(data: any): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('file', blob);

    const response = await fetch(`${IPFS_API}/add`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        let errorMessage = `IPFS upload error: ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMessage = errorData.error;
            } else if (errorData.details) {
                errorMessage = `${errorData.error || 'IPFS upload error'}: ${errorData.details}`;
            }
        } catch {
            try {
                const errorText = await response.text();
                if (errorText) {
                    errorMessage = `IPFS upload error: ${errorText}`;
                }
            } catch {}
        }
        throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.Hash;
}

export async function uploadFileToIPFS(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${IPFS_API}/add`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        let errorMessage = `IPFS file upload error: ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMessage = errorData.error;
            } else if (errorData.details) {
                errorMessage = `${errorData.error || 'IPFS file upload error'}: ${errorData.details}`;
            }
        } catch {
            try {
                const errorText = await response.text();
                if (errorText) {
                    errorMessage = `IPFS file upload error: ${errorText}`;
                }
            } catch {}
        }
        throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.Hash;
}

function cleanCID(cid: string): string {
    return cid
        .replace(/^ipfs:\/\//i, '')
        .replace(/^\/ipfs\//i, '')
        .replace(/^ipfs\//i, '')
        .trim();
}

export async function getFromIPFSGateway(cid: string): Promise<any> {
    const cleanCid = cleanCID(cid);
    if (ipfsCache.has(cleanCid)) {
        // Cache hit (internal): cleanCid
        return ipfsCache.get(cleanCid);
    }

    const url = `${IPFS_GATEWAY}${cleanCid}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
            cache: 'force-cache',
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`IPFS error: ${response.statusText}`);
        }

        const data = await response.json();
        ipfsCache.set(cleanCid, data);
        // Gateway success (internal): cleanCid
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

export function getIPFSUrl(cid: string): string {
    const cleanCid = cleanCID(cid);
    return `${IPFS_GATEWAY}${cleanCid}`;
}

export async function prefetchIPFS(cids: string[]): Promise<void> {
    await Promise.allSettled(cids.map(cid => getFromIPFSGateway(cid)));
}
