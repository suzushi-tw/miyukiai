import { v4 as uuidv4 } from 'uuid';

// Storage interface for upload state persistence
interface UploadState {
    uploadId: string;
    key: string;
    fileName: string;
    fileSize: number;
    chunkSize: number; // Store the chunk size used for this upload
    uploadedParts: {
        PartNumber: number;
        ETag: string | null;
    }[];
    createdAt: number;
    lastUpdated: number;
}

// Helper to determine optimal chunk size based on file size
function getOptimalChunkSize(fileSize: number): number {
    // Minimum chunk size according to S3 is 5MB
    const MIN_CHUNK_SIZE = 5 * 1024 * 1024;

    // For small files (< 100MB), use smaller chunks
    if (fileSize < 100 * 1024 * 1024) {
        return MIN_CHUNK_SIZE;
    }

    // For medium files (100MB - 1GB), use 10MB chunks
    if (fileSize < 1024 * 1024 * 1024) {
        return 10 * 1024 * 1024;
    }

    // For large files (1GB - 5GB), use 25MB chunks
    if (fileSize < 5 * 1024 * 1024 * 1024) {
        return 25 * 1024 * 1024;
    }

    // For very large files (>5GB), use 50MB chunks
    return 50 * 1024 * 1024;
}

// Save upload state to localStorage with size management
const saveUploadState = (state: UploadState): void => {
    try {
        const stateKey = `upload-state-${state.uploadId}`;
        state.lastUpdated = Date.now();

        // Optimize storage by storing only essential data for parts
        // Don't stringify and parse repeatedly
        const compactState = {
            ...state,
            uploadedParts: state.uploadedParts.map(part => ({
                PartNumber: part.PartNumber,
                ETag: part.ETag
            }))
        };

        localStorage.setItem(stateKey, JSON.stringify(compactState));

        // Also save a reference to all active uploads
        const activeUploads = JSON.parse(localStorage.getItem('active-uploads') || '[]');
        if (!activeUploads.includes(state.uploadId)) {
            activeUploads.push(state.uploadId);
            localStorage.setItem('active-uploads', JSON.stringify(activeUploads));
        }
    } catch (error) {
        console.error("Error saving upload state:", error);
        // Try to clear old uploads if we hit storage limits
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            pruneOldUploads();
        }
    }
};

const pruneOldUploads = (): void => {
    try {
        const activeUploads = JSON.parse(localStorage.getItem('active-uploads') || '[]');
        if (activeUploads.length <= 1) return; // Don't prune if we only have one upload

        // Get all upload states and sort by lastUpdated
        const states = activeUploads
            .map((id: string) => {  // Added string type to id parameter
                const state = localStorage.getItem(`upload-state-${id}`);
                return state ? JSON.parse(state) : null;
            })
            .filter(Boolean)
            .sort((a: UploadState, b: UploadState) => a.lastUpdated - b.lastUpdated);  // Added UploadState type to a and b parameters

        // Remove the oldest uploads (keep newest 3)
        for (let i = 0; i < states.length - 3; i++) {
            clearUploadState(states[i].uploadId);
        }
    } catch (error) {
        console.error("Error pruning uploads:", error);
    }
};

// Get upload state from localStorage
const getUploadState = (fileId: string): UploadState | null => {
    try {
        const stateKey = `upload-state-${fileId}`;
        const state = localStorage.getItem(stateKey);
        return state ? JSON.parse(state) : null;
    } catch (error) {
        console.error("Error retrieving upload state:", error);
        return null;
    }
};

const clearUploadState = (uploadId: string): void => {
    try {
        console.log(`Clearing upload state for ID: ${uploadId}`);

        // Remove the specific upload state
        const stateKey = `upload-state-${uploadId}`;
        localStorage.removeItem(stateKey);

        // Also remove from active uploads list
        try {
            const activeUploadsJson = localStorage.getItem('active-uploads');
            if (activeUploadsJson) {
                const activeUploads = JSON.parse(activeUploadsJson);
                if (Array.isArray(activeUploads)) {
                    const updatedUploads = activeUploads.filter((id: string) => id !== uploadId);
                    localStorage.setItem('active-uploads', JSON.stringify(updatedUploads));
                    console.log(`Removed ${uploadId} from active uploads. Remaining: ${updatedUploads.length}`);
                } else {
                    // Reset if not an array
                    localStorage.setItem('active-uploads', '[]');
                }
            }
        } catch (parseError) {
            console.error("Error parsing active uploads, resetting:", parseError);
            localStorage.setItem('active-uploads', '[]');
        }
    } catch (error) {
        console.error(`Error clearing upload state for ${uploadId}:`, error);
    }
};

// Network condition detector
const getNetworkQuality = async (): Promise<'good' | 'medium' | 'poor'> => {
    try {
        const startTime = Date.now();
        const response = await fetch('/api/ping', {
            method: 'HEAD',
            cache: 'no-store'
        });
        const endTime = Date.now();
        const latency = endTime - startTime;

        if (latency < 150) return 'good';
        if (latency < 500) return 'medium';
        return 'poor';
    } catch (error) {
        console.warn("Network quality check failed:", error);
        return 'poor'; // Assume poor connection if test fails
    }
};

export async function uploadLargeFileToS3(
    file: File,
    onProgress?: (progress: number) => void,
    providedUploadId?: string
): Promise<string> {
    // Generate a unique ID for this upload if not resuming
    const fileId = providedUploadId || `${uuidv4()}-${file.name}`;
    let uploadState = getUploadState(fileId);
    let uploadId: string | undefined = uploadState?.uploadId;
    let key: string | undefined = uploadState?.key;

    // Track which parts have been successfully uploaded
    let uploadedParts = uploadState?.uploadedParts || [];

    try {
        // Step 1: Initialize upload if not resuming
        if (!uploadState) {
            console.log("Starting new upload for", file.name);

            // Test network quality to adjust timeouts
            const networkQuality = await getNetworkQuality();
            console.log(`Network quality detected: ${networkQuality}`);

            const initResponse = await fetch('/api/s3multipart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type
                })
            });

            if (!initResponse.ok) {
                throw new Error(`Failed to initiate upload: ${initResponse.statusText}`);
            }

            const initData = await initResponse.json();
            uploadId = initData.uploadId;
            key = initData.key;

            // Make sure we have valid data
            if (!uploadId || !key) {
                throw new Error('Invalid response from server: missing uploadId or key');
            }

            // Determine optimal chunk size for this file
            const chunkSize = getOptimalChunkSize(file.size);
            console.log(`Using chunk size: ${(chunkSize / 1024 / 1024).toFixed(1)}MB for ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB file`);

            // Create a new upload state
            uploadState = {
                uploadId,
                key,
                fileName: file.name,
                fileSize: file.size,
                chunkSize, // Store the chunk size with the state
                uploadedParts: [],
                createdAt: Date.now(),
                lastUpdated: Date.now()
            };

            saveUploadState(uploadState);
            console.log(`Started new multipart upload with ID: ${uploadId}`);
        } else {
            // Resuming an existing upload
            console.log(`Resuming upload for ${file.name} with ID: ${uploadId}`);
            uploadId = uploadState.uploadId;
            key = uploadState.key;
        }

        // Ensure we have valid upload ID and key at this point
        if (!uploadId || !key) {
            throw new Error('Missing uploadId or key for upload');
        }

        // Step 2: Split the file and upload parts
        // Use chunk size from state if resuming, or calculate optimal size
        const CHUNK_SIZE = uploadState.chunkSize || getOptimalChunkSize(file.size);
        const chunks = Math.ceil(file.size / CHUNK_SIZE);

        // Report initial progress based on already uploaded parts
        if (onProgress && uploadedParts.length > 0) {
            onProgress(Math.round((uploadedParts.length / chunks) * 100));
        }

        // Get currently completed part numbers for efficient lookups
        const completedParts = new Set(
            uploadedParts
                .filter(part => part.ETag)
                .map(part => part.PartNumber)
        );

        // Upload each chunk with enhanced retry logic
        for (let partNumber = 1; partNumber <= chunks; partNumber++) {
            // Skip already uploaded parts
            if (completedParts.has(partNumber)) {
                console.log(`Part ${partNumber}/${chunks} already uploaded, skipping`);
                continue;
            }

            // Get the chunk data
            const start = (partNumber - 1) * CHUNK_SIZE;
            const end = Math.min(partNumber * CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            // Enhanced retry logic with adaptive timeouts
            const maxRetries = 5; // Increased retries for better reliability
            let retryCount = 0;
            let success = false;

            while (!success && retryCount <= maxRetries) {
                try {
                    if (retryCount > 0) {
                        const backoffTime = Math.min(30000, 1000 * Math.pow(2, retryCount - 1));
                        console.log(`Retrying part ${partNumber} (attempt ${retryCount}) after ${backoffTime / 1000}s backoff`);
                        // Exponential backoff with jitter
                        await new Promise(r => setTimeout(r, backoffTime + Math.random() * 1000));
                    }

                    // Periodically check network conditions on retries
                    if (retryCount > 0 && retryCount % 2 === 0) {
                        const networkQuality = await getNetworkQuality();
                        console.log(`Network quality check during retry: ${networkQuality}`);
                    }

                    // Get a new presigned URL for this part
                    const urlResponse = await fetch(`/api/s3multipart?uploadId=${uploadId}&key=${key}&partNumber=${partNumber}`);
                    if (!urlResponse.ok) {
                        throw new Error(`Failed to get presigned URL: ${urlResponse.statusText}`);
                    }

                    const { signedUrl } = await urlResponse.json();

                    // Upload with dynamic timeout based on chunk size and network quality
                    const controller = new AbortController();
                    const signal = controller.signal;

                    // Set a more adaptive timeout (60 seconds per MB for poor connections)
                    // with a minimum of 2 minutes per chunk
                    const timeoutMs = Math.max(120000, chunk.size / 1024 * 60);
                    const timeoutId = setTimeout(() => {
                        console.warn(`Upload timeout for part ${partNumber} after ${timeoutMs / 1000}s`);
                        controller.abort();
                    }, timeoutMs);

                    console.log(`Uploading part ${partNumber}/${chunks} (${(chunk.size / 1024 / 1024).toFixed(1)}MB)`);

                    // Use fetch for upload with signal for timeout
                    const uploadResponse = await fetch(signedUrl, {
                        method: 'PUT',
                        body: chunk,
                        signal,
                        // Don't set Content-Length header as it's handled by fetch
                    });

                    clearTimeout(timeoutId);

                    if (!uploadResponse.ok) {
                        throw new Error(`Failed to upload part ${partNumber}: ${uploadResponse.statusText}`);
                    }

                    // Save the ETag
                    const eTag = uploadResponse.headers.get('ETag');
                    console.log(`Part ${partNumber} uploaded successfully, ETag: ${eTag}`);

                    // Update our tracking
                    uploadedParts = [...uploadedParts.filter(p => p.PartNumber !== partNumber), {
                        PartNumber: partNumber,
                        ETag: eTag
                    }];

                    // Update the completed parts set
                    completedParts.add(partNumber);

                    // Update saved state if we have one
                    if (uploadState) {
                        uploadState.uploadedParts = uploadedParts;
                        saveUploadState(uploadState);
                    }

                    success = true;
                } catch (error) {
                    // Special handling for abort errors vs other errors
                    const isAbortError = error instanceof DOMException && error.name === 'AbortError';
                    const errorMessage = isAbortError ? 'timeout' : (error instanceof Error ? error.message : 'unknown error');

                    retryCount++;
                    console.error(`Error uploading part ${partNumber} (retry ${retryCount}/${maxRetries}): ${errorMessage}`);

                    if (retryCount > maxRetries) {
                        throw error; // Rethrow after max retries
                    }

                    // For timeout errors, consider network quality check
                    if (isAbortError && retryCount > 1) {
                        console.log('Chunk upload timed out, checking network quality...');
                        const quality = await getNetworkQuality();
                        console.log(`Network quality: ${quality}`);

                        // If network is very poor, wait longer before retry
                        if (quality === 'poor') {
                            console.log('Poor network detected, adding extra delay before retry');
                            await new Promise(r => setTimeout(r, 10000));
                        }
                    }
                }
            }

            // Report progress - calculate based on completed parts and total parts
            if (onProgress) {
                onProgress(Math.round((completedParts.size / chunks) * 100));
            }
        }

        // Step 3: Complete the multipart upload
        console.log("All parts uploaded, completing multipart upload");
        const completeResponse = await fetch('/api/s3multipart', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uploadId,
                key,
                parts: uploadedParts
            })
        });

        if (!completeResponse.ok) {
            const errorText = await completeResponse.text();
            throw new Error(`Failed to complete upload: ${errorText}`);
        }

        const completeData = await completeResponse.json();
        console.log(`Successfully completed upload: ${key}`);

        // Make sure we clean up the localStorage state
        clearUploadState(fileId);

        return completeData.fileUrl;
    } catch (error) {
        console.error("Multipart upload error:", error);

        // Keep the upload state for resuming, unless explicitly instructed to abort
        if (uploadState && uploadedParts.length === 0 && uploadId && key) {
            console.log("Aborting failed upload with no progress");
            try {
                await fetch(`/api/s3multipart?uploadId=${uploadId}&key=${key}`, {
                    method: 'DELETE'
                });
                clearUploadState(fileId);
            } catch (abortError) {
                console.error("Error aborting upload:", abortError);
            }
        }

        throw error;
    }
}

// Improved function to list and resume incomplete uploads
export async function getIncompleteUploads(): Promise<{
    id: string;
    fileName: string;
    progress: number;
    createdAt: Date;
    size: string;  // Now returning human-readable size
}[]> {
    const activeUploads = JSON.parse(localStorage.getItem('active-uploads') || '[]');
    const uploads = [];

    for (const uploadId of activeUploads) {
        const state = getUploadState(uploadId);
        if (state) {
            // Calculate progress using the saved chunk size for accuracy
            const chunkSize = state.chunkSize || getOptimalChunkSize(state.fileSize);
            const totalChunks = Math.ceil(state.fileSize / chunkSize);
            const completedChunks = state.uploadedParts.filter(part => part.ETag).length;

            // Format file size for display
            const formattedSize = formatFileSize(state.fileSize);

            uploads.push({
                id: uploadId,
                fileName: state.fileName,
                progress: Math.round((completedChunks / totalChunks) * 100),
                createdAt: new Date(state.createdAt),
                size: formattedSize
            });
        }
    }

    // Sort by most recent first
    return uploads.filter(upload => upload.progress < 100);
}

// Helper to format file size
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}