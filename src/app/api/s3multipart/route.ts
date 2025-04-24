import { NextResponse } from 'next/server';
import { S3Client } from '@aws-sdk/client-s3';
import { 
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configure your S3 client to point to R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

// Initiate a multipart upload
export async function POST(request: Request) {
  try {
    const { fileName, contentType } = await request.json();
    
    const command = new CreateMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      ContentType: contentType
    });
    
    const { UploadId } = await s3Client.send(command);
    
    return NextResponse.json({ uploadId: UploadId, key: fileName });
  } catch (error) {
    console.error('Failed to initiate multipart upload:', error);
    return NextResponse.json({ error: 'Failed to initiate upload' }, { status: 500 });
  }
}

// Get presigned URL for a specific part
export async function GET(request: Request) {
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

  try {
    const command = new UploadPartCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: parseInt(partNumber),
      // 5MB minimum for all parts except the last one
      ContentLength: 5 * 1024 * 1024
    });
    
    // Generate presigned URL for this part
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
    const { uploadId, key, parts } = await request.json();
    
    const command = new CompleteMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
      }
    });
    
    const result = await s3Client.send(command);
    
    return NextResponse.json({ 
      success: true, 
      location: result.Location 
    });
  } catch (error) {
    console.error('Failed to complete multipart upload:', error);
    return NextResponse.json({ error: 'Failed to complete upload' }, { status: 500 });
  }
}

// Abort a multipart upload
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const uploadId = url.searchParams.get('uploadId');
  const key = url.searchParams.get('key');
  
  if (!uploadId || !key) {
    return NextResponse.json(
      { error: 'Missing required parameters' }, 
      { status: 400 }
    );
  }

  try {
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