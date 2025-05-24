import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  // Parse query params
  const cursor = searchParams.get("cursor");
  const search = searchParams.get("search");
  const modelType = searchParams.get("modelType");
  const baseModel = searchParams.get("baseModel");
  const id = searchParams.get("id"); // Added id parameter
  const limit = 12; // Number of models per page

  try {
    // If id is provided, fetch a single model
    if (id) {
      const model = await db.model.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          },          images: {
            orderBy: {
              order: 'asc'
            },
            select: {
              id: true,
              url: true,
              isNsfw: true,
              order: true
            }
          }
        }
      });

      if (!model) {
        return NextResponse.json(
          { error: "Model not found" },
          { status: 404 }
        );
      }

      // Transform the model data
      const transformedModel = {
        id: model.id,
        name: model.name,
        description: model.description || "",
        version: model.version,
        modelType: model.modelType,
        baseModel: model.baseModel,
        tags: model.tags || "",
        triggerWords: model.triggerWords || "",
        license: model.license || "",
        fileUrl: model.fileUrl,
        fileSize: model.fileSize, 
        fileName: model.fileName,
        downloads: model.downloads,
        user: model.user,        images: model.images.map(img => ({
          id: img.id,
          url: img.url,
          isNsfw: img.isNsfw || false,
          order: img.order
        })),
        createdAt: model.createdAt,
        updatedAt: model.updatedAt
      };

      return NextResponse.json({ model: transformedModel });
    }
    // Build query filters
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { contains: search, mode: "insensitive" } },
      ];
    }
    
    if (modelType) {
      where.modelType = modelType;
    }
    
    if (baseModel) {
      where.baseModel = baseModel;
    }

    // Fetch models with pagination
    const models = await db.model.findMany({
      take: limit + 1, // Get one extra to check if there are more
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where,
      orderBy: [
        { createdAt: "desc" }
      ],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },        images: {
          orderBy: {
            order: 'asc'
          },
          take: 1,
          select: {
            id: true,
            url: true,
            isNsfw: true,
            order: true
          }
        }
      }
    });

    // Check if there are more results
    const hasNextPage = models.length > limit;
    const nextModels = hasNextPage ? models.slice(0, limit) : models;
    const nextCursor = hasNextPage ? nextModels[nextModels.length - 1].id : null;

    // Transform models to match TransformedModel type
    const transformedModels = nextModels.map(model => ({
      id: model.id,
      name: model.name,
      description: model.description || "",
      version: model.version,
      modelType: model.modelType,
      baseModel: model.baseModel,
      tags: model.tags || "",
      license: model.license || "",
      fileUrl: model.fileUrl,
      fileSize: model.fileSize, // No conversion needed anymore
      fileName: model.fileName,
      downloads: model.downloads,
      user: model.user,      images: model.images.map(img => ({
        id: img.id,
        url: img.url,
        isNsfw: img.isNsfw || false,
        order: img.order
      })),
      createdAt: model.createdAt,
      updatedAt: model.updatedAt
    }));

    console.log("Model images with NSFW status:", models.map(m => ({
      id: m.id,
      images: m.images.map(img => ({
        id: img.id, 
        isNsfw: img.isNsfw
      }))
    })));

    return NextResponse.json({ 
      models: transformedModels, 
      nextCursor 
    });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}