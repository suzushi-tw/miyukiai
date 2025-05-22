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
    const data = await request.json();
    
    // Validate the incoming data has the required fields
    if (!data.id) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }
      // Check if model exists and belongs to the current user
    const existingModel = await db.model.findFirst({
      where: {
        id: data.id,
        userId: sessionData.user.id,
      },
    });
    
    if (!existingModel) {
      return NextResponse.json({ error: 'Model not found or you do not have permission to edit it' }, { status: 404 });
    }
    
    // Update only the editable fields
    const updatedModel = await db.model.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        description: data.description,
        version: data.version,
        modelType: data.modelType,
        baseModel: data.baseModel,
        license: data.license,
        tags: data.tags,
        triggerWords: data.triggerWords,
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      model: updatedModel 
    });
  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json({ error: 'Failed to update model' }, { status: 500 });
  }
}
