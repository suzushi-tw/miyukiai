import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// Initialize R2 client (R2 uses the S3 SDK with custom configuration)
const r2Client = new S3Client({
  region: 'auto', // R2 uses 'auto' region
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

// Configuration
const BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const CUSTOM_DOMAIN = process.env.R2_PUBLIC_DOMAIN; // Optional custom domain for your bucket

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { fileName, fileType, fileSize } = body;
    
    // Validate input
    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large' },
        { status: 400 }
      );
    }

    // Generate a unique file key
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;
    const key = `uploads/${uniqueFileName}`;

    // Create the command
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    // Generate the presigned URL
    const presignedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // URL expires in 1 hour
    });

    // Return the URL and the file key
    // For R2, the public URL depends on if you're using a custom domain or the default R2 URL
    const publicUrl = CUSTOM_DOMAIN 
      ? `https://${CUSTOM_DOMAIN}/${key}`
      : `https://${BUCKET_NAME}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
      
    return NextResponse.json({
      uploadUrl: presignedUrl,
      fileKey: key,
      fileUrl: publicUrl,
    });
  } catch (error) {
    console.error('Error generating R2 presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}