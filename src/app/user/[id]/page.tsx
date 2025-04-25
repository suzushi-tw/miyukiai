import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/prisma"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SimpleIconsX, SimpleIconsHuggingface, CibKoFi, LineMdBuyMeACoffeeTwotone } from "@/lib/icon"
import { Download, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

// Function to render social icon by name with proper type annotation
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

// Platform display names with index signature
const platformNames: { [key: string]: string } = {
    "twitter": "Twitter",
    "huggingface": "Hugging Face",
    "kofi": "Ko-fi",
    "buymeacoffee": "Buy Me A Coffee"
};



export default async function UserProfilePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const userId = id;

    // Fetch user data with social links
    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            socialLinks: true
        }
    });

    if (!user) {
        notFound();
    }

    // Fetch user's models with counts
    const models = await db.model.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { images: true }
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

    return (
        <div className="container mx-auto max-w-6xl py-8">
            {/* Profile Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <Avatar className="w-32 h-32">
                        <AvatarImage src={user.image || "/placeholder.svg"} alt={user.name} />
                        <AvatarFallback className="text-4xl">{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-2">{user.name}</h1>

                        {/* User stats */}
                        <div className="flex flex-wrap gap-6 justify-center md:justify-start mb-4">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="py-1.5">
                                    <Download className="h-4 w-4 mr-1" />
                                    {totalDownloads} Downloads
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="py-1.5">
                                    {modelCount} Model{modelCount !== 1 ? 's' : ''}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="py-1.5">
                                    {imageCount} Image{imageCount !== 1 ? 's' : ''}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="py-1.5">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
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

                                            {/* Display first image if available or placeholder */}
                                            <div className="relative aspect-video rounded-md overflow-hidden bg-accent/20 mb-2">
                                                {model._count.images > 0 ? (
                                                    <div className="w-full h-full">
                                                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                                            <span className="text-xs">Loading preview...</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                        <span className="text-xs">No preview available</span>
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
                                                <span>{formatDistanceToNow(new Date(model.createdAt), { addSuffix: true })}</span>
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
                                {user.name} has not uploaded any models yet.
                            </p>
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
                                        {image.url && (
                                            <Image
                                                src={image.url}
                                                alt={`Image from ${image.model.name}`}
                                                fill
                                                className="object-cover transition-transform group-hover:scale-105"
                                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                            />
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
                                {user.name} has not uploaded any images yet.
                            </p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}