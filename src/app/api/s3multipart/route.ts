import { NextResponse } from 'next/server';
import { S3Client } from '@aws-sdk/client-s3';
import { 
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { auth } from '@/lib/auth';

// Configure your S3 client to point to R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
// Make sure R2_PUBLIC_DOMAIN is correctly set in your environment variables
const PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || '';

// Initiate a multipart upload
export async function POST(request: Request) {
  try {
    // Authenticate user
    const sessionData = await auth.api.getSession({
      query: { disableCookieCache: true }, 
      headers: request.headers, 
    });
    
    // Check if session exists and has user data
    if (!sessionData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { fileName, contentType } = await request.json();
    
    // Ensure the model files go in a dedicated folder with proper naming
    const modelKey = `models/${sessionData.user.id}/${Date.now()}-${fileName}`;
    
    const command = new CreateMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: modelKey,
      ContentType: contentType || 'application/octet-stream',
      Metadata: {
        userId: sessionData.user.id,
        uploadTime: new Date().toISOString(),
        modelName: fileName
      }
    });
    
    const { UploadId } = await s3Client.send(command);
    
    // Ensure we have a properly formatted fileUrl
    const fileUrl = PUBLIC_DOMAIN ? 
      `${PUBLIC_DOMAIN}/${modelKey}` : 
      `https://${BUCKET_NAME}.r2.dev/${modelKey}`;
    
    return NextResponse.json({ 
      uploadId: UploadId, 
      key: modelKey,
      fileUrl: fileUrl
    });
  } catch (error) {
    console.error('Failed to initiate multipart upload:', error);
    return NextResponse.json({ error: 'Failed to initiate upload' }, { status: 500 });
  }
}

// Get presigned URL for a specific part
export async function GET(request: Request) {
  try {
    // Authenticate user
    const sessionData = await auth.api.getSession({
      query: { disableCookieCache: true }, 
      headers: request.headers, 
    });
    
    if (!sessionData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const uploadId = url.searchParams.get('uploadId');
    const key = url.searchParams.get('key');
    const partNumber = url.searchParams.get('partNumber');
    
    if (!uploadId || !key || !partNumber) {
      return NextResponse.json(
        { error: 'Missing required parameters' }, 
        { status: 400 }
      );
    }

    // Ensure the user owns this upload (key should contain user ID)
    if (!key.includes(`models/${sessionData.user.id}/`)) {
      return NextResponse.json({ error: 'Unauthorized access to this upload' }, { status: 403 });
    }

    const command = new UploadPartCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: parseInt(partNumber)
      // Remove ContentLength to allow flexible part sizes
    });
    
    // Generate presigned URL for this part (1 hour validity)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error('Failed to generate presigned URL:', error);
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
  }
}

// Complete the multipart upload
export async function PUT(request: Request) {
  try {
    // Authenticate user
    const sessionData = await auth.api.getSession({
      query: { disableCookieCache: true }, 
      headers: request.headers, 
    });
    
    if (!sessionData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { uploadId, key, parts } = await request.json();
    
    // Ensure the user owns this upload
    if (!key.includes(`models/${sessionData.user.id}/`)) {
      return NextResponse.json({ error: 'Unauthorized access to this upload' }, { status: 403 });
    }
    
    const command = new CompleteMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
      }
    });
    
    const result = await s3Client.send(command);
    
    // Ensure we have a properly formatted fileUrl
    const fileUrl = PUBLIC_DOMAIN ? 
      `${PUBLIC_DOMAIN}/${key}` : 
      `https://${BUCKET_NAME}.r2.dev/${key}`;
    
    return NextResponse.json({ 
      success: true, 
      fileUrl,
      key
    });
  } catch (error) {
    console.error('Failed to complete multipart upload:', error);
    return NextResponse.json({ error: 'Failed to complete upload' }, { status: 500 });
  }
}

// Abort a multipart upload
export async function DELETE(request: Request) {
  try {
    // Authenticate user
    const sessionData = await auth.api.getSession({
      query: { disableCookieCache: true }, 
      headers: request.headers, 
    });
    
    if (!sessionData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const uploadId = url.searchParams.get('uploadId');
    const key = url.searchParams.get('key');
    
    if (!uploadId || !key) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Ensure the user owns this upload
    if (!key.includes(`models/${sessionData.user.id}/`)) {
      return NextResponse.json({ error: 'Unauthorized access to this upload' }, { status: 403 });
    }

    const command = new AbortMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId
    });
    
    await s3Client.send(command);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to abort multipart upload:', error);
    return NextResponse.json({ error: 'Failed to abort upload' }, { status: 500 });
  }
}