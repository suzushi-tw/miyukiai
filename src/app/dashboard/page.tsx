'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SimpleIconsX, SimpleIconsHuggingface, CibKoFi, LineMdBuyMeACoffeeTwotone } from "@/lib/icon";
import { Download, Calendar, Loader2, Trash2, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { authClient } from '@/lib/auth-client';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// --- Types ---
interface SocialLink {
    id: string;
    platform: string;
    url: string;
    icon: string;
}

interface User {
    id: string;
    name: string;
    image: string | null;
    createdAt: string;
    socialLinks: SocialLink[];
}

interface Model {
    id: string;
    name: string;
    version: string;
    modelType: string;
    description: string | null;
    downloads: number;
    createdAt: string;
    _count: {
        images: number;
    };
    previewImage?: string | null;
}

interface ModelImage {
    id: string;
    url: string;
    createdAt: string;
    model: {
        id: string;
        name: string;
    };
}

interface UserProfileData {
    user: User;
    models: Model[];
    images: ModelImage[];
    stats: {
        totalDownloads: number;
        modelCount: number;
        imageCount: number;
        joinedDate: string;
    };
}
// --- End Types ---

function SocialIconByName({ name, ...props }: { name: string } & React.SVGProps<SVGSVGElement>) {
    switch (name) {
        case "SimpleIconsX":
            return <SimpleIconsX {...props} />;
        case "SimpleIconsHuggingface":
            return <SimpleIconsHuggingface {...props} />;
        case "CibKoFi":
            return <CibKoFi {...props} />;
        case "LineMdBuyMeACoffeeTwotone":
            return <LineMdBuyMeACoffeeTwotone {...props} />;
        default:
            return null;
    }
}

function formatDate(dateString: string) {
    try {
        if (!dateString) {
            console.warn("Empty date string received");
            return formatDistanceToNow(new Date(), { addSuffix: true });
        }

        const date = new Date(dateString);

        if (isNaN(date.getTime())) {
            console.warn("Invalid date:", dateString);
            return formatDistanceToNow(new Date(), { addSuffix: true });
        }

        return formatDistanceToNow(date, { addSuffix: true });
    } catch (err) {
        console.error("Date parsing error:", err, dateString);
        return "Unknown date";
    }
}

const platformNames: { [key: string]: string } = {
    "twitter": "Twitter",
    "huggingface": "Hugging Face",
    "kofi": "Ko-fi",
    "buymeacoffee": "Buy Me A Coffee"
};

export default function UserProfilePage() {
    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();
    const [profileData, setProfileData] = useState<UserProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteModelId, setDeleteModelId] = useState<string | null>(null);
    const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isPending) return;

        if (!session?.user) {
            router.push('/');
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/users`, {
                    method: 'POST',
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        setError('Unauthorized. Please log in again.');
                        return;
                    }
                    if (response.status === 404) {
                        setError('User profile not found.');
                        return;
                    }
                    throw new Error(`Failed to fetch data: ${response.statusText} (${response.status})`);
                }
                const data: UserProfileData = await response.json();
                setProfileData(data);

                // Initialize loading state for all images
                const imageLoadingState: Record<string, boolean> = {};
                data.models.forEach(model => {
                    if (model.previewImage) {
                        imageLoadingState[model.previewImage] = true;
                    }
                });

                data.images.forEach(image => {
                    if (image.url) {
                        imageLoadingState[image.url] = true;
                    }
                });

                setLoadingImages(imageLoadingState);
            } catch (err: unknown) {
                console.error("Fetch error:", err);
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('An unexpected error occurred');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [session, isPending, router]);

    // Function to handle when an image finishes loading
    const handleImageLoaded = (imageUrl: string) => {
        setLoadingImages(prev => ({ ...prev, [imageUrl]: false }));
    };

    // Function to handle model deletion
    const handleDeleteModel = async (modelId: string) => {
        if (!modelId) return;

        setIsDeleting(true);
        setDeleteModelId(modelId);

        try {
            const response = await fetch(`/api/deletemodel?id=${modelId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`Failed to delete model: ${response.statusText}`);
            }

            // Update local state to remove the deleted model
            if (profileData) {
                // Find the model to calculate new stats
                const deletedModel = profileData.models.find(m => m.id === modelId);
                const deletedDownloads = deletedModel?.downloads || 0;

                // Filter out deleted model images too
                const updatedImages = profileData.images.filter(img => img.model.id !== modelId);

                setProfileData({
                    ...profileData,
                    models: profileData.models.filter(model => model.id !== modelId),
                    images: updatedImages,
                    stats: {
                        ...profileData.stats,
                        totalDownloads: profileData.stats.totalDownloads - deletedDownloads,
                        modelCount: profileData.stats.modelCount - 1,
                        imageCount: updatedImages.length,
                    }
                });
            }

            toast.success("Model deleted", {
                description: "Your model has been successfully deleted."
            });

        } catch (error) {
            console.error("Error deleting model:", error);
            toast.error("Failed to delete model", {
                description: error instanceof Error ? error.message : "An unexpected error occurred"
            });
        } finally {
            setIsDeleting(false);
            setDeleteModelId(null);
        }
    };

    if (loading || isPending) {
        return (
            <div className="container mx-auto max-w-6xl py-8">
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start mb-8">
                    <Skeleton className="w-32 h-32 rounded-full" />
                    <div className="flex-1 w-full">
                        <Skeleton className="h-10 w-48 mb-4" />
                        <div className="flex flex-wrap gap-2 mb-4">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-6 w-28" />
                        </div>
                    </div>
                </div>

                <Skeleton className="h-0.5 w-full my-8" />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="border rounded-lg overflow-hidden">
                            <div className="p-6">
                                <Skeleton className="h-7 w-3/4 mb-3" />
                                <Skeleton className="h-5 w-1/2 mb-4" />
                                <Skeleton className="h-40 w-full rounded-md mb-4" />
                                <div className="flex justify-between">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto max-w-6xl py-8 text-center text-red-600">
                <p>Error loading profile: {error}</p>
            </div>
        );
    }

    if (!profileData) {
        return null;
    }

    const { user, models, images, stats } = profileData;

    return (
        <div className="container mx-auto max-w-6xl py-8">
            {/* Profile Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <Avatar className="w-32 h-32">
                        <AvatarImage src={user.image || "/placeholder.svg"} alt={user.name || 'User avatar'} />
                        <AvatarFallback className="text-4xl">{user.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-2">{user.name || 'User'}</h1>

                        {/* User stats */}
                        <div className="flex flex-wrap gap-6 justify-center md:justify-start mb-4">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="py-1.5">
                                    <Download className="h-4 w-4 mr-1" />
                                    {stats.totalDownloads} Downloads
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="py-1.5">
                                    {stats.modelCount} Model{stats.modelCount !== 1 ? 's' : ''}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="py-1.5">
                                    {stats.imageCount} Image{stats.imageCount !== 1 ? 's' : ''}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="py-1.5">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    Joined {stats.joinedDate}
                                </Badge>
                            </div>
                        </div>

                        {/* Social links */}
                        {user.socialLinks && user.socialLinks.length > 0 && (
                            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                {user.socialLinks.map((link) => (
                                    <a
                                        key={link.id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm hover:bg-accent transition-colors"
                                    >
                                        <SocialIconByName name={link.icon} className="h-4 w-4" />
                                        <span>{platformNames[link.platform] || link.platform}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Separator className="my-8" />

            {/* Tabs for Models and Images */}
            <Tabs defaultValue="models" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="models">Models</TabsTrigger>
                    <TabsTrigger value="images">Images</TabsTrigger>
                </TabsList>

                {/* Models Tab */}
                <TabsContent value="models">
                    {models.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {models.map((model) => (
                                <Card className="h-full transition-shadow hover:shadow-md" key={model.id}>
                                    <Link href={`/model/${model.id}`}>
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="line-clamp-1">{model.name}</CardTitle>
                                                    <CardDescription className="flex items-center gap-1 mt-1">
                                                        <Badge variant="secondary" className="font-mono text-xs">
                                                            v{model.version}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs">
                                                            {model.modelType}
                                                        </Badge>
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            {/* Model Preview Image Area */}
                                            <div className="relative aspect-video rounded-md overflow-hidden bg-accent/20 mb-2">
                                                {model._count.images > 0 && model.previewImage ? (
                                                    <>
                                                        {loadingImages[model.previewImage] && (
                                                            <div className="absolute inset-0 z-10">
                                                                <Skeleton className="w-full h-full" />
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <Image
                                                            src={model.previewImage}
                                                            alt={`Preview of ${model.name}`}
                                                            fill
                                                            className="object-cover"
                                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                            onLoadingComplete={() => handleImageLoaded(model.previewImage!)}
                                                        />
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                        <span className="text-xs">
                                                            {model._count.images > 0 ? "Loading preview..." : "No preview available"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Link>
                                    <CardFooter>
                                        <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Download className="h-3.5 w-3.5" />
                                                <span>{model.downloads} downloads</span>
                                            </div>                                            <div className="flex items-center gap-3">
                                                <span>{formatDate(model.createdAt)}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        router.push(`/edit-model/${model.id}`);
                                                    }}                                                    aria-label="Edit model"
                                                    title="Edit model"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        // Remove preventDefault and stopPropagation
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Model</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete &quot;{model.name}&quot;? This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="bg-red-500 hover:bg-red-600"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteModel(model.id);
                                                                }}
                                                                disabled={isDeleting && deleteModelId === model.id}
                                                            >
                                                                {isDeleting && deleteModelId === model.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                ) : null}
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <h3 className="text-lg font-medium mb-2">No models yet</h3>
                            <p className="text-muted-foreground mb-6">
                                You have not uploaded any models yet.
                            </p>
                        </div>
                    )}
                </TabsContent>

                {/* Images Tab */}
                <TabsContent value="images">
                    {images.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {images.map((image) => (
                                <Link href={`/model/${image.model.id}`} key={image.id} className="group">
                                    <div className="relative aspect-square rounded-md overflow-hidden bg-accent/20">
                                        {image.url ? (
                                            <>
                                                {loadingImages[image.url] && (
                                                    <div className="absolute inset-0 z-10">
                                                        <Skeleton className="w-full h-full" />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                        </div>
                                                    </div>
                                                )}
                                                <Image
                                                    src={image.url}
                                                    alt={`Image from ${image.model.name}`}
                                                    fill
                                                    className="object-cover transition-transform group-hover:scale-105"
                                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                    onLoadingComplete={() => handleImageLoaded(image.url)}
                                                />
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                <span className="text-xs">Image unavailable</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 transition-opacity opacity-0 group-hover:opacity-100">
                                            <p className="text-white text-sm truncate">{image.model.name}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <h3 className="text-lg font-medium mb-2">No images yet</h3>
                            <p className="text-muted-foreground mb-6">
                                You have not uploaded any images yet.
                            </p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}