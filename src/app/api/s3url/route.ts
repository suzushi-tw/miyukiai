import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { auth } from '@/lib/auth';

// Initialize R2 client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request: Request) {
  try {
    // Need to await the Promise returned by getSession
    const sessionData = await auth.api.getSession({
        query: {
            disableCookieCache: true,
        }, 
        headers: request.headers, 
    });
   
    // Check if session exists and has user data
    if (!sessionData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { contentType, folder = 'general' } = body;
    
    // Simple validation
    if (!contentType) {
      return NextResponse.json({ error: 'Content type is required' }, { status: 400 });
    }
    
    // Create normalized folder path
    const normalizedFolder = folder.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const fileExtension = contentType.split('/')[1] || 'bin';
    const fileName = `${normalizedFolder}/${randomUUID()}.${fileExtension}`;

    // Create command
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileName,
      ContentType: contentType,
      Metadata: {
        userId: sessionData.user.id, // Now using the awaited session data
        uploadTime: new Date().toISOString(),
      }
    });

    // Generate presigned URL (valid for 5 minutes)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Return the URLs
    return NextResponse.json({
      presignedUrl,
      key: fileName,
      fileUrl: `${process.env.R2_PUBLIC_URL}/${fileName}`
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}