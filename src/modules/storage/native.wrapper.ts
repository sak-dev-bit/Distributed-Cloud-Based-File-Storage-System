import path from 'path';

// Use a try-catch for the native module to avoid crashing if not compiled
let native: any;
try {
    // Assuming the .node file is in the root native folder or similar
    const nativePath = path.resolve(__dirname, '../../../native/storage_native.node');
    native = require(nativePath);
} catch (err) {
    console.warn('Native storage module not loaded. Falling back to JS implementation.', err);
    native = {
        processFile: () => { throw new Error('Native processFile not available'); },
        replicate: () => { throw new Error('Native replicate not available'); }
    };
}

export interface NativeChunk {
    index: number;
    hash: string;
    sizeBytes: number;
}

export const nativeProcessFile = (filePath: string, chunkSize: number): NativeChunk[] => {
    return native.processFile(filePath, chunkSize);
};

export const nativeReplicate = (storageKey: string, targetNodeUrls: string[]): string => {
    return native.replicate(storageKey, targetNodeUrls);
};
