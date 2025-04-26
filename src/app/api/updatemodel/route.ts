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
    const { id, ...modelData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    // Verify the model belongs to this user
    const existingModel = await db.model.findUnique({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!existingModel) {
      return NextResponse.json({ error: 'Model not found or access denied' }, { status: 404 });
    }

    // Update the model
    const updatedModel = await db.model.update({
      where: { id },
      data: {
        ...modelData,
        updatedAt: new Date()
      },
    });

    return NextResponse.json(updatedModel);
  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json(
      { error: 'Failed to update model' }, 
      { status: 500 }
    );
  }
}