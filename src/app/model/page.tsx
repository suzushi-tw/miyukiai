"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { ArrowLeft, Filter } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { baseModelOptions, modelTypeOptions } from "@/utils/model";
import ModelCard from '@/components/Modelcard';
import ModelCardSkeleton from '@/components/modelskeleton';
import type { ApiModel, TransformedModel } from '@/types/model';

// Filter schema
const filterFormSchema = z.object({
    modelType: z.string().optional(),
    baseModel: z.string().optional(),
});

type FilterFormValues = z.infer<typeof filterFormSchema>;

// Function to transform model data from API format
function transformModel(apiModel: ApiModel): TransformedModel {
    return {
        id: apiModel.id,
        name: apiModel.name || '',
        description: apiModel.description || null,
        version: apiModel.version || '1.0',
        modelType: apiModel.modelType || 'Unknown',
        baseModel: apiModel.baseModel || 'Unknown',
        tags: apiModel.tags || null,
        downloads: apiModel.downloads || 0,
        fileSize: apiModel.fileSize || '0',
        createdAt: new Date(apiModel.createdAt || Date.now()),
        images: apiModel.images || [],
        user: {
            id: apiModel.user?.id || 'unknown-user-id',
            name: apiModel.user?.name || 'Unknown User',
            image: apiModel.user?.image || null
        }
    };
}

// Function to fetch models from API with filters
const fetchFilteredModels = async ({
    pageParam = 1,
    modelType,
    baseModel
}: {
    pageParam: number;
    modelType?: string;
    baseModel?: string;
}) => {
    const params = new URLSearchParams();

    if (pageParam > 1 && typeof pageParam === 'string') {
        params.append("cursor", pageParam);
    }

    if (modelType) params.append("modelType", modelType);
    if (baseModel) params.append("baseModel", baseModel);

    const response = await fetch(`/api/getmodels?${params.toString()}`);

    if (!response.ok) {
        throw new Error('Failed to fetch models');
    }

    const data = await response.json();

    return {
        models: data.models,
        nextPage: data.nextCursor
    };
};

export default function ModelExplorerPage() {
    const router = useRouter();
    const { ref, inView } = useInView();
    const [filters, setFilters] = useState<{
        modelType?: string;
        baseModel?: string;
    }>({});

    const form = useForm<FilterFormValues>({
        resolver: zodResolver(filterFormSchema),
        defaultValues: {
            modelType: "any",
            baseModel: "any",
        },
    });

    // Setup infinite query with filters
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
        refetch
    } = useInfiniteQuery({
        queryKey: ['models', filters],
        queryFn: ({ pageParam }) => fetchFilteredModels({
            pageParam,
            modelType: filters.modelType,
            baseModel: filters.baseModel
        }),
        getNextPageParam: (lastPage) => lastPage.nextPage,
        initialPageParam: 1
    });

    const onSubmit = (values: FilterFormValues) => {
        setFilters({
            modelType: values.modelType === "any" ? undefined : values.modelType,
            baseModel: values.baseModel === "any" ? undefined : values.baseModel
        });
    };

    // Reset filters
    const resetFilters = () => {
        form.reset({
            modelType: "any",
            baseModel: "any",
        });
        setFilters({});
    };


    // Load more models when scrolling to the bottom
    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);

    // Get active filter count
    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    return (
        <div className="container max-w-6xl mx-auto py-12 px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>

                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Filter className="h-4 w-4" />
                            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-md w-full ">
                        <div className="px-1 py-2 mx-3">
                            <SheetHeader className="mb-6">
                                <SheetTitle className="text-xl">Filter Models</SheetTitle>
                                <SheetDescription className="text-sm text-muted-foreground">
                                    Refine your search for specific model types and architectures.
                                </SheetDescription>
                            </SheetHeader>

                            <Separator className="my-6 opacity-50" />

                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                    <FormField
                                        control={form.control}
                                        name="modelType"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2.5">
                                                <FormLabel className="text-base">Model Type</FormLabel>
                                                <div className="relative">
                                                    <FormControl>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            defaultValue={field.value}
                                                        >
                                                            <SelectTrigger className="w-full h-10">
                                                                <SelectValue placeholder="Any type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="any">Any type</SelectItem>
                                                                {modelTypeOptions.map((option) => (
                                                                    <SelectItem key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="baseModel"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2.5">
                                                <FormLabel className="text-base">Base Architecture</FormLabel>
                                                <div className="relative">
                                                    <FormControl>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            defaultValue={field.value}
                                                        >
                                                            <SelectTrigger className="w-full h-10">
                                                                <SelectValue placeholder="Any architecture" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="any">Any architecture</SelectItem>
                                                                {baseModelOptions.map((option) => (
                                                                    <SelectItem key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    <Separator className="my-6 opacity-50" />

                                    <div className="flex justify-between pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={resetFilters}
                                            className="px-4"
                                        >
                                            Reset
                                        </Button>
                                        <Button type="submit" className="px-6">
                                            Apply Filters
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="text-left mb-8">
                <h1 className="text-3xl font-bold">Models</h1>
                {activeFilterCount > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                        Filtered by: {filters.modelType && `Type: ${filters.modelType}`} {filters.baseModel && `Architecture: ${filters.baseModel}`}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {status === 'pending' ? (
                    Array.from({ length: 8 }).map((_, i) => (
                        <ModelCardSkeleton key={i} />
                    ))
                ) : status === 'error' ? (
                    <div className="col-span-full text-center py-10">
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center p-6">
                                <h3 className="text-xl font-medium text-red-500">
                                    Error loading models
                                </h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Please try again later or adjust your filters
                                </p>
                                <Button className="mt-4" onClick={() => refetch()}>
                                    Retry
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                ) : data?.pages[0].models.length === 0 ? (
                    <div className="col-span-full text-center py-10">
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center p-6">
                                <h3 className="text-xl font-medium">
                                    No models found
                                </h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Try adjusting your filters or check back later
                                </p>
                                {activeFilterCount > 0 && (
                                    <Button className="mt-4" variant="outline" onClick={resetFilters}>
                                        Clear Filters
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    data.pages.flatMap((page) => (
                        page.models.map((model: ApiModel) => (
                            <ModelCard key={model.id} model={transformModel(model)} />
                        ))
                    ))
                )}

                {/* Loading more items */}
                {isFetchingNextPage && (
                    <>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <ModelCardSkeleton key={`loading-more-${i}`} />
                        ))}
                    </>
                )}
            </div>

            {/* Intersection observer target */}
            <div
                ref={ref}
                className="h-10 w-full flex items-center justify-center mt-8"
            >
                {hasNextPage && !isFetchingNextPage && (
                    <span className="text-sm text-gray-500">Scroll for more</span>
                )}
            </div>

            {/* End of results message */}
            {!hasNextPage && status !== 'pending' && data?.pages[0].models.length > 0 && (
                <div className="text-center mt-8 text-gray-500">
                    No more models to load
                </div>
            )}
        </div>
    );
}