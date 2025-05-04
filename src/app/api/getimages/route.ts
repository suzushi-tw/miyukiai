import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma } from "@/generated/prisma";

// Define the expected return type including relationships
type ImageWithRelations = Prisma.ModelImageGetPayload<{
  include: {
    user: { select: { id: true; name: true; image: true } };
    model: { select: { id: true; name: true } };
  };
}>;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = 20; // Number of images per page
    
    console.log("API: Received request for images with cursor:", cursor);

    // Build the query with explicit typing
    const query = {
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        model: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
      take: limit + 1, // Take one extra to determine if there's a next page
    } as const;

    // Add cursor-based pagination if a cursor is provided
    if (cursor) {
      const cursorObj = { id: cursor };
      const queryWithCursor = {
        ...query,
        cursor: cursorObj,
        skip: 1, // Skip the cursor item itself
      };

      console.log(`API: Executing query with cursor: ${cursor}`);
      // Execute the query with cursor
      const images = await db.modelImage.findMany(queryWithCursor);
      return processImages(images, limit);
    } else {
      console.log("API: Executing initial query without cursor");
      // Execute the query without cursor
      const images = await db.modelImage.findMany(query);
      return processImages(images, limit);
    }

  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

// Helper function to process images and return formatted response
function processImages(images: any[], limit: number) {
  // Determine if there's a next page
  let nextCursor = null;
  if (images.length > limit) {
    const nextItem = images.pop(); // Remove the extra item
    nextCursor = nextItem?.id;
  }
  
  console.log(`API: Processing ${images.length} images, nextCursor: ${nextCursor}`);

  const sanitizedImages = images.map(image => {
    const modelData = 'model' in image ? image.model : null;
    const userData = 'user' in image ? image.user : null;

    return {
      id: image.id,
      url: image.url,
      modelId: image.modelId,
      model: {
        id: modelData?.id || image.modelId,
        name: modelData?.name || "Unknown Model"
      },
      userId: image.userId,
      user: {
        id: userData?.id || image.userId,
        name: userData?.name || "Unknown User",
        image: userData?.image || null
      },
      metadata: image.metadata || null,
      isNsfw: image.isNsfw === true, // Explicitly convert to boolean
      createdAt: image.createdAt.toISOString(),
    };
  });

  return NextResponse.json({
    images: sanitizedImages,
    nextCursor,
  });
}