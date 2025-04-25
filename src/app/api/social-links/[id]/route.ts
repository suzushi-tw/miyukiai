import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

// Delete a social link
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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
    
    // Check if the link belongs to the user
    const socialLink = await db.socialLink.findUnique({
      where: {
        id: params.id,
      },
    });
    
    if (!socialLink || socialLink.userId !== sessionData.user.id) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
    }
    
    // Delete the social link
    await db.socialLink.delete({
      where: {
        id: params.id,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete social link' }, { status: 500 });
  }
}