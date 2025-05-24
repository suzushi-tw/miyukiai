import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PUT(request: Request) {
  try {
    // Verify the user is authenticated
    const sessionData = await auth.api.getSession({
      query: { disableCookieCache: true },
      headers: request.headers,
    });
    
    if (!sessionData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse the request body
    const { modelId, imageOrders } = await request.json();
    
    // Validate the incoming data
    if (!modelId || !Array.isArray(imageOrders)) {
      return NextResponse.json({ error: 'Model ID and image orders are required' }, { status: 400 });
    }
    
    // Check if model exists and belongs to the current user
    const existingModel = await db.model.findFirst({
      where: {
        id: modelId,
        userId: sessionData.user.id,
      },
    });
    
    if (!existingModel) {
      return NextResponse.json({ error: 'Model not found or you do not have permission to edit it' }, { status: 404 });
    }
    
    // Update image orders in a transaction
    await db.$transaction(async (tx) => {
      for (const { imageId, order } of imageOrders) {
        await tx.modelImage.updateMany({
          where: {
            id: imageId,
            modelId: modelId, // Ensure the image belongs to this model
          },
          data: {
            order: order,
          },
        });
      }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Image order updated successfully'
    });
  } catch (error) {
    console.error('Error updating image order:', error);
    return NextResponse.json({ error: 'Failed to update image order' }, { status: 500 });
  }
}
