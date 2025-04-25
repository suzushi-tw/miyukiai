import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

// Get all social links for the current user
export async function GET(request: Request) {
  try {
    const sessionData = await auth.api.getSession({
        query: {
            disableCookieCache: true,
        }, 
        headers: request.headers, 
    });
    
    if (!sessionData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const socialLinks = await db.socialLink.findMany({
      where: {
        userId: sessionData.user.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    return NextResponse.json(socialLinks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch social links' }, { status: 500 });
  }
}

// Create a new social link
export async function POST(request: Request) {
  try {
    const sessionData = await auth.api.getSession({
        query: {
            disableCookieCache: true,
        }, 
        headers: request.headers, 
    });
    
    if (!sessionData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { platform, url, icon } = await request.json();
    
    // Basic validation
    if (!platform || !url || !icon) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const socialLink = await db.socialLink.create({
      data: {
        platform,
        url,
        icon,
        userId: sessionData.user.id,
      },
    });
    
    return NextResponse.json(socialLink);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create social link' }, { status: 500 });
  }
}

// Delete a social link (using DELETE method + query parameter)
export async function DELETE(request: Request) {
  try {
    // Get the ID from the URL query parameter
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing link ID' }, { status: 400 });
    }
    
    const sessionData = await auth.api.getSession({
      query: {
        disableCookieCache: true,
      },
      headers: request.headers,
    });
    
    if (!sessionData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if the link belongs to the user
    const socialLink = await db.socialLink.findUnique({
      where: { id },
    });
    
    if (!socialLink || socialLink.userId !== sessionData.user.id) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
    }
    
    // Delete the social link
    await db.socialLink.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete social link' }, { status: 500 });
  }
}