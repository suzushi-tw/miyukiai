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
    const { modelId, magnetURI, infoHash } = await request.json();

    if (!modelId) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    if (!magnetURI || !infoHash) {
      return NextResponse.json({ error: 'Both magnetURI and infoHash are required' }, { status: 400 });
    }

    // Verify the model exists and belongs to the current user
    const existingModel = await db.model.findFirst({
      where: {
        id: modelId,
        userId: session.user.id
      }
    });

    if (!existingModel) {
      return NextResponse.json({ error: 'Model not found or access denied' }, { status: 404 });
    }

    // Update the model with torrent information
    const updatedModel = await db.model.update({
      where: { id: modelId },
      data: {
        magnetURI,
        infoHash,
        updatedAt: new Date()
      }
    });

    console.log(`Updated model ${modelId} with torrent info: ${infoHash}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Torrent information updated successfully',
      magnetURI: updatedModel.magnetURI,
      infoHash: updatedModel.infoHash 
    });

  } catch (error) {
    console.error('Error updating torrent information:', error);
    return NextResponse.json(
      { error: 'Failed to update torrent information: ' + (error instanceof Error ? error.message : 'Unknown error') }, 
      { status: 500 }
    );
  }
}
