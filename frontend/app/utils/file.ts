/**
 * File and data conversion utilities
 */

/**
 * Convert base64 string to Blob
 */
export const base64ToBlob = (base64Data: string, type: string = 'image/png'): Blob => {
    return new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], { type });
};

/**
 * Trigger file download via temporary anchor element
 */
export const downloadFile = (url: string, filename: string): void => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Convert File to base64 data URL
 */
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Convert IPFS gateway URL to ipfs:// URI
 */
export const gatewayUrlToIpfsUri = (url: string): string => {
    if (url.startsWith('https://ipfs.io/ipfs/')) {
        return `ipfs://${url.replace('https://ipfs.io/ipfs/', '')}`;
    }
    return url;
};

/**
 * Convert ipfs:// URI to HTTP gateway URL
 */
export const ipfsToHttp = (url: string): string => {
    if (url?.startsWith('ipfs://')) {
        return `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`;
    }
    return url;
};
