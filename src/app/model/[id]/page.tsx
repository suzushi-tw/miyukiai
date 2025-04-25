import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { CalendarDays, Download, Tag, BookOpen, FileText, User, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import GalleryImageItem from "@/components/Galleryimageitem";
import ExpandableDescription from "@/components/Expanddescription";

import { ComfyMetadata } from "@/utils/getimgmetadata";

// Helper function for formatting file size
function formatBytes(bytes: bigint, decimals = 2) {
    if (bytes === BigInt(0)) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(Number(bytes)) / Math.log(k));
    return parseFloat((Number(bytes) / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Define the expected structure for images, matching GalleryImageItem's expectation
interface GalleryImage {
    id: string;
    url: string;
    metadata: ComfyMetadata | null;
    createdAt: Date;
}

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;

    const model = await db.model.findUnique({
        where: {
            id: id,
        },
        include: {
            images: {
                orderBy: {
                    createdAt: 'asc',
                },
                select: {
                    id: true,
                    url: true,
                    metadata: true,
                    createdAt: true,
                }
            },
            user: {
                include: {
                    socialLinks: true,
                }
            },
        },
    });

    if (!model) {
        notFound();
    }

    const tags = model.tags ? model.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    const featuredImage = model.images.length > 0 ? model.images[0]?.url : '/placeholder-model.jpg';
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    }).format(model.createdAt);
    const formattedFileSize = formatBytes(model.fileSize);

    const galleryImages = model.images.map(img => ({
        ...img,
        metadata: img.metadata as ComfyMetadata | null
    })) as GalleryImage[];

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
            {/* Hero Section */}
            <div className="relative mb-8 md:mb-12 aspect-[16/7] md:aspect-[16/5] rounded-xl overflow-hidden shadow-lg">
                {featuredImage && (
                    <Image
                        src={featuredImage}
                        fill
                        alt={model.name}
                        className="object-cover"
                        priority
                    />
                )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-6 md:p-8">
                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-md">{model.name}</h1>
                    <div className="flex items-center text-white/90 space-x-4 text-sm md:text-base">
                        <div className="flex items-center space-x-1.5">
                            <CalendarDays className="w-4 h-4" />
                            <span>{formattedDate}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <Download className="w-4 h-4" />
                            <span>{model.downloads.toLocaleString()} downloads</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Horizontal Image Gallery Section */}
            {galleryImages.length > 0 && (
                <div className="mb-8 md:mb-12">
                    <h2 className="text-2xl font-semibold mb-4">Gallery</h2>
                    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                        <div className="flex w-max space-x-4 p-4">
                            {galleryImages.map((image) => (
                                <GalleryImageItem key={image.id} image={image} modelName={model.name} />
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
            )}

            {/* Main Content Grid (Description + Sidebar) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2">
                    {/* Description Card with Expandable Component */}
                     <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Use the client component here */}
                            <ExpandableDescription description={model.description} maxLines={5} />
                        </CardContent>
                    </Card>

                    {/* Add other content like comments here if needed */}
                    {/* Example: Comments Section */}
                    {/* <Card>
                        <CardHeader>
                            <CardTitle>Comments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            Placeholder for comments component
                        </CardContent>
                    </Card> */}
                </div>

                {/* Sidebar */}
                <div className="space-y-6 lg:mt-0">
                    {/* Download Card */}
                    <Card>
                        <CardContent className="pt-6">
                            <Button asChild size="lg" className="w-full">
                                <a href={model.fileUrl} download={model.fileName}>
                                    <Download className="mr-2 h-5 w-5" /> Download Model
                                </a>
                            </Button>
                            <p className="text-center text-sm text-muted-foreground mt-3">
                                {formattedFileSize} • {model.fileName}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Model Details Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex items-start">
                                <FileText className="w-5 h-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Model Type</p>
                                    <p className="font-medium">{model.modelType}</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <BookOpen className="w-5 h-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Base Model</p>
                                    <p className="font-medium">{model.baseModel}</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <Tag className="w-5 h-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Version</p>
                                    <p className="font-medium">{model.version}</p>
                                </div>
                            </div>
                            {model.license && (
                                <div className="flex items-start">
                                    <FileText className="w-5 h-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">License</p>
                                        <p className="font-medium">{model.license}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tags Card */}
                    {tags.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Tags</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                {tags.map((tag, index) => (
                                    <Badge key={index} variant="secondary">
                                        {tag}
                                    </Badge>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Creator Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Creator</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={model.user.image ?? undefined} alt={model.user.name ?? 'User avatar'} />
                                    <AvatarFallback>
                                        <User className="h-6 w-6" />
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{model.user.name}</p>
                                    <p className="text-sm text-muted-foreground">{model.user.email}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}