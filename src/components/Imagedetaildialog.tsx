'use client'

import { useState } from "react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ComfyMetadata } from "@/utils/getimgmetadata";

interface ImageDetailsDialogProps {
    image: {
        id: string;
        url: string;
        metadata: ComfyMetadata | null;
        createdAt: Date;
    };
}

export default function ImageDetailsDialog({ image }: ImageDetailsDialogProps) {
    const [copyingPositive, setCopyingPositive] = useState(false);
    const [copyingNegative, setCopyingNegative] = useState(false);

    // Function to safely render metadata values
    const renderMetadataValue = (value: unknown) => {
        if (value === undefined || value === null || value === '') return <span className="text-muted-foreground italic">N/A</span>;
        // Handle potential objects/arrays if necessary, otherwise stringify
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return <div className="truncate" title={displayValue}>{displayValue}</div>;
    };

    // Handle copying text to clipboard
    const copyToClipboard = async (text: string, isPositive: boolean) => {
        try {
            await navigator.clipboard.writeText(text);

            // Show success state briefly
            if (isPositive) {
                setCopyingPositive(true);
                setTimeout(() => setCopyingPositive(false), 2000);
            } else {
                setCopyingNegative(true);
                setTimeout(() => setCopyingNegative(false), 2000);
            }

            // Show toast notification
            toast.success(`${isPositive ? "Positive" : "Negative"} prompt copied to clipboard`);
        } catch (err) {
            toast.error("Failed to copy text");
            console.error("Failed to copy text: ", err);
        }
    };

    const metadata = image.metadata || {};

    return (
        <Dialog>
            <DialogTrigger asChild>
                <div
                    className="aspect-square w-60 h-60 md:w-72 md:h-72 flex-shrink-0 rounded-lg overflow-hidden relative group border cursor-pointer"
                    role="button"
                    tabIndex={0}
                >
                    <Image
                        src={image.url}
                        fill
                        alt={image.id}
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 240px, 288px"
                        priority={false}
                    />
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share link</DialogTitle>
                    <DialogDescription>
                        Anyone who has this link will be able to view this.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[80vh]">
                    <div className="p-6">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl">Image Generation Metadata</DialogTitle>
                            <DialogDescription className="text-base">
                                Parameters used to generate this image.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <Card>
                                    <CardContent className="pt-6">
                                        <h4 className="font-medium text-lg mb-4">Image Info</h4>
                                        <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm">
                                            <div className="font-medium text-muted-foreground">Dimensions</div>
                                            {renderMetadataValue(`${metadata.width} × ${metadata.height}px`)}

                                            {image.metadata?.bitDepth !== undefined && (
                                                <>
                                                    <div className="font-medium text-muted-foreground">Bit Depth</div>
                                                    {renderMetadataValue(metadata.bitDepth)}
                                                </>
                                            )}

                                            {image.metadata?.colorType && (
                                                <>
                                                    <div className="font-medium text-muted-foreground">Color Type</div>
                                                    {renderMetadataValue(metadata.colorType)}
                                                </>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-6">
                                        <h4 className="font-medium text-lg mb-4">Generation Settings</h4>
                                        <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm">
                                            {image.metadata?.model && (
                                                <>
                                                    <div className="font-medium text-muted-foreground">Model</div>
                                                    {renderMetadataValue(image.metadata?.model)}
                                                </>
                                            )}

                                            {image.metadata?.seed !== undefined && (
                                                <>
                                                    <div className="font-medium text-muted-foreground">Seed</div>
                                                    {renderMetadataValue(image.metadata?.seed)}
                                                </>
                                            )}

                                            {image.metadata?.steps !== undefined && (
                                                <>
                                                    <div className="font-medium text-muted-foreground">Steps</div>
                                                    {renderMetadataValue(image.metadata?.steps)}
                                                </>
                                            )}

                                            {image.metadata?.cfg !== undefined && (
                                                <>
                                                    <div className="font-medium text-muted-foreground">CFG Scale</div>
                                                    {renderMetadataValue(image.metadata?.cfg)}
                                                </>
                                            )}

                                            {image.metadata?.sampler && (
                                                <>
                                                    <div className="font-medium text-muted-foreground">Sampler</div>
                                                    {renderMetadataValue(image.metadata?.sampler)}
                                                </>
                                            )}

                                            {image.metadata?.scheduler && (
                                                <>
                                                    <div className="font-medium text-muted-foreground">Scheduler</div>
                                                    {renderMetadataValue(image.metadata?.scheduler)}
                                                </>
                                            )}

                                            {image.metadata?.denoise !== undefined && (
                                                <>
                                                    <div className="font-medium text-muted-foreground">Denoise</div>
                                                    {renderMetadataValue(image.metadata?.denoise)}
                                                </>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                {image.metadata?.positivePrompt && (
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="font-medium text-lg">Positive Prompt</h4>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(image.metadata?.positivePrompt as string, true)}
                                                    className="h-8 px-2"
                                                >
                                                    {copyingPositive ? (
                                                        <><CheckCircle2 className="h-4 w-4 mr-1" /> Copied</>
                                                    ) : (
                                                        <><Copy className="h-4 w-4 mr-1" /> Copy</>
                                                    )}
                                                </Button>
                                            </div>
                                            <ScrollArea className="h-40 rounded-md">
                                                <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
                                                    {image.metadata.positivePrompt}
                                                </div>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                )}

                                {image.metadata?.negativePrompt && (
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="font-medium text-lg">Negative Prompt</h4>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (image.metadata && image.metadata.positivePrompt) {
                                                            copyToClipboard(image.metadata.positivePrompt, true);
                                                        }
                                                    }}
                                                    className="h-8 px-2"
                                                >
                                                    {copyingNegative ? (
                                                        <><CheckCircle2 className="h-4 w-4 mr-1" /> Copied</>
                                                    ) : (
                                                        <><Copy className="h-4 w-4 mr-1" /> Copy</>
                                                    )}
                                                </Button>
                                            </div>
                                            <ScrollArea className="h-40 rounded-md">
                                                <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
                                                    {image.metadata.negativePrompt}
                                                </div>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="sm:justify-start">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}