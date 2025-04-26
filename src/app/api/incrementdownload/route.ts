import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const modelId = searchParams.get('id');

        if (!modelId) {
            return NextResponse.json({ error: "Missing model ID" }, { status: 400 });
        }

        await db.model.update({
            where: { id: modelId },
            data: { downloads: { increment: 1 } },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error incrementing download count:', error);
        return NextResponse.json({ error: "Failed to update download count" }, { status: 500 });
    }
}