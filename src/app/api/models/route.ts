import { NextResponse } from 'next/server';
import { db } from '@/lib/drizzle';
import { model } from '@/lib/schema';
import { auth } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm'; // Import the operators

export async function GET(request: Request) {
  try {
    // Optional: Get user session for personalized results
    // Using void to avoid unused variable warning
    void await auth.api.getSession({
      headers: request.headers,
    });

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const modelType = searchParams.get('modelType');
    const baseModel = searchParams.get('baseModel');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query - using correct Drizzle syntax
    let query = db.select().from(model);
    
    // Correct where clause syntax using eq()
    if (modelType) {
      query = query.where(eq(model.modelType, modelType));
    }
    
    if (baseModel) {
      query = query.where(eq(model.baseModel, baseModel));
    }
    
    // Correct orderBy syntax 
    const models = await query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(model.createdAt)); // Use desc() for descending order

    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}