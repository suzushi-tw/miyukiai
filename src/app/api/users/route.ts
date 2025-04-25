import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';
import { formatDistanceToNow } from 'date-fns';

// Define a recursive type to replace 'any'
type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined 
  | Date 
  | bigint
  | JsonObject 
  | JsonArray;

interface JsonObject {
  [key: string]: JsonValue;
}

type JsonArray = JsonValue[];

function replaceBigInt(data: JsonValue): JsonValue {
    if (data === null || data === undefined) {
        return data;
    }

    if (typeof data === 'bigint') {
        return data.toString();
    }

    // Explicitly handle Date objects - preserve the original timestamp
    if (data instanceof Date) {
        return data.toISOString();
    }

    if (Array.isArray(data)) {
        return data.map(replaceBigInt);
    }

    if (typeof data === 'object') {
        return Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, replaceBigInt(value)])
        );
    }

    return data;
}

export async function POST(request: Request) {
    try { // Outer try block starts here
        // Need to await the Promise returned by getSession
        const sessionData = await auth.api.getSession({
            query: {
                disableCookieCache: true,
            },
            headers: request.headers,
        });

        if (!sessionData?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = sessionData.user.id;

        // This check might be redundant if sessionData.user.id is guaranteed, but kept for safety
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Inner try block for database operations
        try {
            // Fetch user data with social links
            const user = await db.user.findUnique({
                where: { id: userId },
                include: {
                    socialLinks: true
                }
            });

            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // Fetch user's models with counts
            const models = await db.model.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                include: {
                    _count: {
                        select: { images: true }
                    },
                    images: {
                        take: 1, // Get just the first image for preview
                        select: {
                            url: true
                        }
                    }
                }
            });

            // Fetch user's images
            const images = await db.modelImage.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                include: {
                    model: {
                        select: { name: true, id: true }
                    }
                }
            });

            // Calculate stats
            const totalDownloads = models.reduce((sum, model) => sum + model.downloads, 0);
            const modelCount = models.length;
            const imageCount = images.length;
            const joinedDate = formatDistanceToNow(new Date(user.createdAt), { addSuffix: true });

            const modelsWithPreview = models.map(model => ({
                ...model,
                previewImage: model.images?.[0]?.url || null,
                images: undefined // Remove the full images array to avoid sending too much data
            }));

            // Return combined data
            return NextResponse.json(replaceBigInt({
                user,
                models: modelsWithPreview,
                images,
                stats: {
                    totalDownloads,
                    modelCount,
                    imageCount,
                    joinedDate,
                }
            }));

        } catch (dbError) { // Catch errors specifically from the database operations
            console.error('Error fetching user profile data:', dbError);
            return NextResponse.json({ error: 'Failed to fetch user profile data' }, { status: 500 });
        }

    } catch (authError) { // Add catch block for the outer try
        console.error('Error during authentication or initial setup:', authError);
        // Handle potential errors from getSession or other issues before the inner try
        if (authError instanceof Error && authError.message.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
    }
}