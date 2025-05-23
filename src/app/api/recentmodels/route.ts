import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';


export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '12');
  const offset = (page - 1) * limit;

  try {
    // Get total count for pagination
    const totalCount = await db.model.count();
    
    // Fetch models with pagination and related data
    const models = await db.model.findMany({
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
      include: {        user: {
          select: {
            id: true,  // Add id to selected fields
            name: true,
            image: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            isNsfw: true
          },
        },
      },
    });    const serializedModels = models.map(model => ({
      ...model,
      fileSize: model.fileSize // No need to convert to string anymore
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;
    const nextPage = hasMore ? page + 1 : null;

    return NextResponse.json({
      models: serializedModels,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore,
        nextPage,
      },
    });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}