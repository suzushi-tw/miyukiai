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
            query: {
                disableCookieCache: true,
            },
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
                userId: userId, // Ensure the model belongs to the authenticated user
            },
            include: {
                images: true, // Include images for deletion
            },
        });

        if (!model) {
            return NextResponse.json({ error: 'Model not found or not owned by user' }, { status: 404 });
        }

        try {
            // Extract the file key from the URL
            const fileUrl = new URL(model.fileUrl);
            const fileKey = fileUrl.pathname.substring(1); // Remove leading slash
            
            // Delete the model file from R2
            await s3Client.send(
                new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME!,
                    Key: fileKey,
                })
            );

            // Delete all associated images from R2
            for (const image of model.images) {
                try {
                    const imageUrl = new URL(image.url);
                    const imageKey = imageUrl.pathname.substring(1);
                    await s3Client.send(
                        new DeleteObjectCommand({
                            Bucket: process.env.R2_BUCKET_NAME!,
                            Key: imageKey,
                        })
                    );
                } catch (imageError) {
                    console.error(`Failed to delete image file ${image.url}:`, imageError);
                }
            }
        } catch (storageError) {
            console.error('Error deleting files from storage:', storageError);
            // Continue with database deletion even if file deletion fails
        }

        // Delete the model from the database (will cascade delete related images)
        await db.model.delete({
            where: { id: modelId },
        });

        return NextResponse.json({ success: true, message: 'Model deleted successfully' });
    } catch (error) {
        console.error('Error deleting model:', error);
        return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 });
    }
}