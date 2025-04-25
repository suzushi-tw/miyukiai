'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation"; // Import useRouter
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
import { Separator } from "@/components/ui/separator";
import { SimpleIconsX, SimpleIconsHuggingface, CibKoFi, LineMdBuyMeACoffeeTwotone } from "@/lib/icon";
import { Download, Calendar, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { authClient } from '@/lib/auth-client';

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
    previewImage?: string; // Add this field
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
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return "Unknown date";
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
    const [loading, setLoading] = useState(isPending); // Initialize loading based on session pending state
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isPending) {
            setLoading(true); // Keep loading while session is pending
            return;
        }

        if (!session?.user) {
            router.push('/'); // Redirect if not logged in
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch logged-in user's data using POST to /api/users
                const response = await fetch(`/api/users`, {
                    method: 'POST',
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        setError('Unauthorized. Please log in again.');
                        // Optionally redirect: router.push('/login');
                        return;
                    }
                    if (response.status === 404) {
                        setError('User profile not found.');
                        // Or use notFound();
                        return;
                    }
                    throw new Error(`Failed to fetch data: ${response.statusText} (${response.status})`);
                }
                const data: UserProfileData = await response.json();
                setProfileData(data);
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

    // Show loading indicator while session is pending OR data is fetching
    if (loading || isPending) {
        return (
            <div className="container mx-auto max-w-6xl py-8 flex justify-center items-center min-h-[60vh]">
                <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // --- Error State ---
    if (error) {
        return (
            <div className="container mx-auto max-w-6xl py-8 text-center text-red-600">
                <p>Error loading profile: {error}</p>
            </div>
        );
    }

    // --- Data Loaded State ---
    if (!profileData) {
        // Should be covered by loading/error states, but acts as a fallback
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
                                <Link href={`/models/${model.id}`} key={model.id}>
                                    <Card className="h-full transition-shadow hover:shadow-md">
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
                                            <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                                                {model.description || "No description provided."}
                                            </p>
                                            {/* Model Preview Image Area */}
                                            <div className="relative aspect-video rounded-md overflow-hidden bg-accent/20 mb-2">
                                                {model._count.images > 0 && model.previewImage ? (
                                                    <Image
                                                        src={model.previewImage}
                                                        alt={`Preview of ${model.name}`}
                                                        fill
                                                        className="object-cover"
                                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                        <span className="text-xs">
                                                            {model._count.images > 0 ? "Loading preview..." : "No preview available"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Download className="h-3.5 w-3.5" />
                                                    <span>{model.downloads} downloads</span>
                                                </div>
                                                <span>{formatDate(model.createdAt)}</span>
                                            </div>
                                        </CardFooter>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <h3 className="text-lg font-medium mb-2">No models yet</h3>
                            <p className="text-muted-foreground mb-6">
                                You have not uploaded any models yet.
                            </p>
                            {/* Optionally add a link/button to upload models */}
                        </div>
                    )}
                </TabsContent>

                {/* Images Tab */}
                <TabsContent value="images">
                    {images.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {images.map((image) => (
                                <Link href={`/models/${image.model.id}`} key={image.id} className="group">
                                    <div className="relative aspect-square rounded-md overflow-hidden bg-accent/20">
                                        {image.url ? (
                                            <Image
                                                src={image.url}
                                                alt={`Image from ${image.model.name}`}
                                                fill
                                                className="object-cover transition-transform group-hover:scale-105"
                                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                            />
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
                            {/* Optionally add a link/button to upload images */}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}