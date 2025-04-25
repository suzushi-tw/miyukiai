import { v4 as uuidv4 } from 'uuid';

// Storage interface for upload state persistence
interface UploadState {
  uploadId: string;
  key: string;
  fileName: string;
  fileSize: number;
  uploadedParts: {
    PartNumber: number;
    ETag: string | null;
  }[];
  createdAt: number;
}

// Save upload state to localStorage
const saveUploadState = (state: UploadState): void => {
  const stateKey = `upload-state-${state.uploadId}`;
  localStorage.setItem(stateKey, JSON.stringify(state));
  
  // Also save a reference to all active uploads
  const activeUploads = JSON.parse(localStorage.getItem('active-uploads') || '[]');
  if (!activeUploads.includes(state.uploadId)) {
    activeUploads.push(state.uploadId);
    localStorage.setItem('active-uploads', JSON.stringify(activeUploads));
  }
};

// Get upload state from localStorage
const getUploadState = (fileId: string): UploadState | null => {
  const stateKey = `upload-state-${fileId}`;
  const state = localStorage.getItem(stateKey);
  return state ? JSON.parse(state) : null;
};

// Clear upload state when complete
const clearUploadState = (uploadId: string): void => {
  const stateKey = `upload-state-${uploadId}`;
  localStorage.removeItem(stateKey);
  
  // Remove from active uploads
  const activeUploads = JSON.parse(localStorage.getItem('active-uploads') || '[]');
  const updatedUploads = activeUploads.filter((id: string) => id !== uploadId);
  localStorage.setItem('active-uploads', JSON.stringify(updatedUploads));
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
            
            // Create a new upload state
            uploadState = {
                uploadId,
                key,
                fileName: file.name,
                fileSize: file.size,
                uploadedParts: [],
                createdAt: Date.now()
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
        // Use smaller chunks for slow connections (5MB instead of 10MB)
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
        const chunks = Math.ceil(file.size / CHUNK_SIZE);
        
        // Report initial progress based on already uploaded parts
        if (onProgress && uploadedParts.length > 0) {
            onProgress(Math.round((uploadedParts.length / chunks) * 100));
        }

        // Upload each chunk with retry logic
        for (let partNumber = 1; partNumber <= chunks; partNumber++) {
            // Skip already uploaded parts
            if (uploadedParts.find(part => part.PartNumber === partNumber && part.ETag)) {
                console.log(`Part ${partNumber}/${chunks} already uploaded, skipping`);
                continue;
            }
            
            // Get the chunk data
            const start = (partNumber - 1) * CHUNK_SIZE;
            const end = Math.min(partNumber * CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);
            
            // Try to upload with retries
            const maxRetries = 3;
            let retryCount = 0;
            let success = false;
            
            while (!success && retryCount <= maxRetries) {
                try {
                    if (retryCount > 0) {
                        console.log(`Retrying part ${partNumber} (attempt ${retryCount})`);
                        // Exponential backoff
                        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retryCount - 1)));
                    }
                    
                    // Get a new presigned URL for this part
                    const urlResponse = await fetch(`/api/s3multipart?uploadId=${uploadId}&key=${key}&partNumber=${partNumber}`);
                    if (!urlResponse.ok) {
                        throw new Error(`Failed to get presigned URL: ${urlResponse.statusText}`);
                    }
                    
                    const { signedUrl } = await urlResponse.json();
                    
                    // Upload with longer timeout
                    const controller = new AbortController();
                    const signal = controller.signal;
                    
                    // Set a generous timeout (30 seconds per MB)
                    const timeoutMs = Math.max(30000, chunk.size / 1024 * 30);
                    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                    
                    const uploadResponse = await fetch(signedUrl, {
                        method: 'PUT',
                        body: chunk,
                        signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!uploadResponse.ok) {
                        throw new Error(`Failed to upload part ${partNumber}: ${uploadResponse.statusText}`);
                    }
                    
                    // Save the ETag
                    const eTag = uploadResponse.headers.get('ETag');
                    
                    // Update our tracking
                    uploadedParts = [...uploadedParts.filter(p => p.PartNumber !== partNumber), {
                        PartNumber: partNumber,
                        ETag: eTag
                    }];
                    
                    // Update saved state if we have one
                    if (uploadState) {
                        uploadState.uploadedParts = uploadedParts;
                        saveUploadState(uploadState);
                    }
                    
                    success = true;
                } catch (error) {
                    retryCount++;
                    console.error(`Error uploading part ${partNumber} (retry ${retryCount}/${maxRetries}):`, error);
                    
                    if (retryCount > maxRetries) {
                        throw error; // Rethrow after max retries
                    }
                }
            }
            
            // Report progress
            if (onProgress) {
                onProgress(Math.round((uploadedParts.length / chunks) * 100));
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
            throw new Error(`Failed to complete upload: ${completeResponse.statusText}`);
        }

        const completeData = await completeResponse.json();
        console.log(`Successfully completed upload: ${key}`);
        
        // Clean up the saved state
        clearUploadState(fileId);

        // Return the URL of the uploaded file
        return completeData.fileUrl || `${process.env.NEXT_PUBLIC_R2_URL}/${key}`;
    } catch (error) {
        console.error("Multipart upload error:", error);
        
        // Don't abort the upload on error if we have uploaded parts
        // This allows for resuming later
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

// New function to list and resume incomplete uploads
export async function getIncompleteUploads(): Promise<{
    id: string;
    fileName: string;
    progress: number;
    createdAt: Date;
}[]> {
    const activeUploads = JSON.parse(localStorage.getItem('active-uploads') || '[]');
    const uploads = [];
    
    for (const uploadId of activeUploads) {
        const state = getUploadState(uploadId);
        if (state) {
            uploads.push({
                id: uploadId,
                fileName: state.fileName,
                progress: Math.round((state.uploadedParts.length / Math.ceil(state.fileSize / (5 * 1024 * 1024))) * 100),
                createdAt: new Date(state.createdAt)
            });
        }
    }
    
    return uploads;
}