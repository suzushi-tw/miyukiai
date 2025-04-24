// Upload file to S3 using the pre-signed URL API
export const uploadFileToS3 = async (
    file: File,
    onProgress?: (progress: number) => void
): Promise<string> => {
    try {
        const response = await fetch('/api/s3url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contentType: file.type,  // Change fileType to contentType
                folder: 'images',         // Add folder parameter
                // Remove fileName and fileSize if not used by API
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get upload URL');
        }

        const { presignedUrl, fileUrl } = await response.json();

        // Upload to S3 with progress tracking
        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.open('PUT', presignedUrl);
            xhr.setRequestHeader('Content-Type', file.type);

            if (onProgress) {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        onProgress(percentComplete);
                    }
                };
            }

            xhr.onload = () => {
                if (xhr.status === 200) {
                    resolve();
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            };

            xhr.onerror = () => reject(new Error('Upload failed'));
            xhr.send(file);
        });

        return fileUrl;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};


export async function uploadLargeFileToS3(
    file: File,
    onProgress?: (progress: number) => void,
    uploadIdParam?: string,
    keyParam?: string
): Promise<string> {
    try {
        // Step 1: Initiate the multipart upload
        const initResponse = await fetch('/api/s3multipart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: `models/${Date.now()}-${file.name}`,
                contentType: file.type
            })
        });

        if (!initResponse.ok) {
            throw new Error(`Failed to initiate upload: ${initResponse.statusText}`);
        }

        const { uploadId, key } = await initResponse.json();

        // Step 2: Split the file and upload parts
        const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
        const chunks = Math.ceil(file.size / CHUNK_SIZE);
        const uploadedParts = [];

        for (let partNumber = 1; partNumber <= chunks; partNumber++) {
            // Get presigned URL for this part
            const urlResponse = await fetch(`/api/s3multipart?uploadId=${uploadId}&key=${key}&partNumber=${partNumber}`);
            if (!urlResponse.ok) {
                throw new Error(`Failed to get presigned URL: ${urlResponse.statusText}`);
            }

            const { signedUrl } = await urlResponse.json();

            // Calculate the chunk
            const start = (partNumber - 1) * CHUNK_SIZE;
            const end = Math.min(partNumber * CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            // Upload the chunk directly to R2 using the signed URL
            const uploadResponse = await fetch(signedUrl, {
                method: 'PUT',
                body: chunk
            });

            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload part ${partNumber}: ${uploadResponse.statusText}`);
            }

            // Save the ETag from the response headers
            const eTag = uploadResponse.headers.get('ETag');
            uploadedParts.push({
                PartNumber: partNumber,
                ETag: eTag
            });

            // Report progress
            if (onProgress) {
                onProgress(Math.round((partNumber / chunks) * 100));
            }
        }

        // Step 3: Complete the multipart upload
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

        // Just await the response, no need to store in 'result' if not used
        await completeResponse.json();

        // Return the URL of the uploaded file
        return `${process.env.NEXT_PUBLIC_R2_URL}/${key}`;
    } catch (error) {
        console.error("Multipart upload error:", error);

        // If we have an uploadId and key, try to abort the upload
        if (uploadIdParam && keyParam) {
            await fetch(`/api/s3multipart?uploadId=${uploadIdParam}&key=${keyParam}`, {
                method: 'DELETE'
            }).catch(console.error);
        }

        throw error;
    }
}
