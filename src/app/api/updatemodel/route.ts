import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      query: { disableCookieCache: true },
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { id, images, ...modelData } = body;

    console.log('Update request received for model:', id);
    console.log('Current user ID:', session.user.id);
    console.log('Images received:', images);

    if (!id) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    // First check if the model exists at all
    const modelExists = await db.model.findUnique({
      where: { id },
    });

    if (!modelExists) {
      return NextResponse.json({ error: `Model with ID ${id} not found in database` }, { status: 404 });
    }

    // Then check if it belongs to the current user
    const existingModel = await db.model.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        images: true
      }
    });

    if (!existingModel) {
      console.log(`Model exists but belongs to user ${modelExists.userId}, not current user ${session.user.id}`);
      return NextResponse.json({ error: 'Access denied - you do not own this model' }, { status: 403 });
    }

    // Prepare the update data
    const updateData = { ...modelData, updatedAt: new Date() };
    
    // Handle the images update separately if images are provided
    if (images && Array.isArray(images) && images.length > 0) {
      // First delete existing images if we're replacing them
      await db.modelImage.deleteMany({
        where: {
          modelId: id
        }
      });
      
      // Then create new image records
      for (const image of images) {
        await db.modelImage.create({
          data: {
            url: image.url,
            metadata: image.metadata || {},
            userId: session.user.id,
            modelId: id
          }
        });
      }
    }

    // Update the model (without including the images in this operation)
    const updatedModel = await db.model.update({
      where: { id },
      data: updateData,
      include: {
        images: true // Include images in the response
      }
    });

    // Convert BigInt to string for JSON serialization
    const serializedModel = {
      ...updatedModel,
      fileSize: updatedModel.fileSize?.toString(),
      images: updatedModel.images
    };

    return NextResponse.json(serializedModel);
  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json(
      { error: 'Failed to update model: ' + (error instanceof Error ? error.message : 'Unknown error') }, 
      { status: 500 }
    );
  }
}