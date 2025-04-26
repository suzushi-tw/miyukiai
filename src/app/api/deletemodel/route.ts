import { NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

// Initialize R2 client
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

// Helper function to extract file key from URL
function extractFileKeyFromUrl(fileUrl: string | null): string | null {
    if (!fileUrl || fileUrl.trim() === '') {
        console.log("Empty file URL encountered");
        return null;
    }
    
    try {
        // Parse URL and get pathname
        const url = new URL(fileUrl);
        // Remove the leading slash from pathname
        return url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    } catch (error) {
        console.log(`Failed to parse URL: ${fileUrl}`, error);
        
        // Fallback: Try to extract path manually for r2.miyukiai.com domain
        if (fileUrl.includes('r2.miyukiai.com/')) {
            const parts = fileUrl.split('r2.miyukiai.com/');
            if (parts.length > 1) {
                return parts[1]; // Return everything after the domain
            }
        }
        
        // Second fallback: if URL starts with models/ or previews/ or images/
        const prefixes = ['models/', 'previews/', 'images/'];
        for (const prefix of prefixes) {
            if (fileUrl.includes(prefix)) {
                const index = fileUrl.indexOf(prefix);
                return fileUrl.substring(index);
            }
        }
        
        console.log(`Could not extract key from URL: ${fileUrl}`);
        return null;
    }
}

export async function DELETE(request: Request) {
    try {
        // Get modelId from the URL query parameter
        const url = new URL(request.url);
        const modelId = url.searchParams.get('id');

        if (!modelId) {
            return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
        }

        // Verify user authentication
        const sessionData = await auth.api.getSession({
            query: { disableCookieCache: true },
            headers: request.headers,
        });

        if (!sessionData?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = sessionData.user.id;

        // Check if the model exists and belongs to the user
        const model = await db.model.findUnique({
            where: {
                id: modelId,
                userId: userId,
            },
            include: {
                images: true,
            },
        });

        if (!model) {
            return NextResponse.json({ error: 'Model not found or not owned by user' }, { status: 404 });
        }

        // Track deletion results
        const deletedFiles = {
            model: false,
            images: 0,
            errors: [] as string[]
        };

        try {
            // Delete model file if it exists
            if (model.fileUrl) {
                const fileKey = extractFileKeyFromUrl(model.fileUrl);
                
                if (fileKey) {
                    console.log(`Deleting model file: ${fileKey}`);
                    await s3Client.send(
                        new DeleteObjectCommand({
                            Bucket: process.env.R2_BUCKET_NAME!,
                            Key: fileKey,
                        })
                    );
                    deletedFiles.model = true;
                } else {
                    deletedFiles.errors.push(`Invalid model file URL: ${model.fileUrl}`);
                }
            }

            // Delete associated image files
            for (const image of model.images) {
                if (!image.url) continue;
                
                const imageKey = extractFileKeyFromUrl(image.url);
                if (imageKey) {
                    try {
                        console.log(`Deleting image file: ${imageKey}`);
                        await s3Client.send(
                            new DeleteObjectCommand({
                                Bucket: process.env.R2_BUCKET_NAME!,
                                Key: imageKey,
                            })
                        );
                        deletedFiles.images++;
                    } catch (imageError) {
                        console.error(`Failed to delete image file: ${imageKey}`, imageError);
                        deletedFiles.errors.push(`Failed to delete image: ${image.id}`);
                    }
                } else {
                    deletedFiles.errors.push(`Invalid image file URL: ${image.url}`);
                }
            }
        } catch (storageError) {
            console.error('Error deleting files from storage:', storageError);
            deletedFiles.errors.push(storageError instanceof Error ? storageError.message : 'Unknown storage error');
            // Continue with database deletion even if file deletion fails
        }

        // Delete the model from the database (will cascade delete related images)
        await db.model.delete({
            where: { id: modelId },
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Model deleted successfully',
            deletedFiles 
        });
    } catch (error) {
        console.error('Error deleting model:', error);
        return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 });
    }
}