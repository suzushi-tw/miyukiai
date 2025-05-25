import { NextRequest, NextResponse } from "next/server";
import { db } from '@/lib/prisma';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    
    if (!query) {
      return NextResponse.json(
        { models: [] },
        { status: 200 }
      );
    }
      const models = await db.model.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { baseModel: { contains: query, mode: 'insensitive' } },
          { modelType: { contains: query, mode: 'insensitive' } },
          { tags: { contains: query, mode: 'insensitive' } },
          { triggerWords: { contains: query, mode: 'insensitive' } },
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },        images: {
          orderBy: {
            order: 'asc'  // Order by the order field to get banner image first
          },
          take: 1,  // Only take the first image (banner image with order 0)
          select: {
            url: true,
            isNsfw: true,
            order: true  // Include order field in response
          }
        }
      },
      orderBy: {
        downloads: 'desc'
      },
      take: 20
    });

    // Convert BigInt values to strings to make them JSON serializable
    const serializedModels = models.map(model => ({
      ...model,
      fileSize: model.fileSize?.toString(), // Convert BigInt to string
    }));

    return NextResponse.json(
      { models: serializedModels },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error searching models:", error);
    return NextResponse.json(
      { error: "Failed to search models" },
      { status: 500 }
    );
  }
}