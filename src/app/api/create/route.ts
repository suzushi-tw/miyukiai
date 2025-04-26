import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

// Define specific types for your upload data
interface ImageUpload {
  url: string;
  metadata?: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    // Authenticate user
    const sessionData = await auth.api.getSession({
      query: { disableCookieCache: true },
      headers: request.headers,
    });

    if (!sessionData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request data
    const {
      name,
      description,
      version,
      modelType,
      baseModel,
      license,
      tags,
      fileUrl,
      fileName,
      fileSize,
      images
    } = await request.json();

    // Create the model in database
    const model = await db.model.create({
      data: {
        name,
        description,
        version,
        modelType,
        baseModel,
        tags,
        license,
        fileUrl,
        fileName,
        fileSize: BigInt(fileSize || 0), // Provide default value
        userId: sessionData.user.id,
        downloads: 0,
        images: {
          create: images.map((image: ImageUpload) => ({
            url: image.url,
            metadata: image.metadata || {},
            userId: sessionData.user.id
          }))
        }
      },
      // Include the created images in the response
      include: {
        images: true
      }
    });

    // Convert BigInt to string for JSON serialization
    const serializedModel = {
      ...model,
      id: model.id,
      fileSize: model.fileSize.toString(),
      createdAt: model.createdAt,
      updatedAt: model.updatedAt
    };

    return NextResponse.json({ id: model.id, success: true, model: serializedModel });
  } catch (error) {
    console.error('Error saving model to database:', error);
    return NextResponse.json({ error: 'Failed to save model' }, { status: 500 });
  }
}