import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { hash } = await req.json();
    
    if (!hash) {
      return NextResponse.json({ error: "No hash provided" }, { status: 400 });
    }
    
    // Check if a model with this hash exists
    const existingModel = await db.model.findFirst({
      where: { 
        fileHash: hash 
      },
      select: {
        id: true,
        name: true,
        userId: true,
        fileName: true
      }
    });
    
    return NextResponse.json({ 
      exists: !!existingModel,
      model: existingModel ? {
        id: existingModel.id,
        name: existingModel.name,
        fileName: existingModel.fileName
      } : null
    });
    
  } catch (error) {
    console.error("Error checking duplicate:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}