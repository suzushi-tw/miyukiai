'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { fetchModels } from '@/services/modelservice';
import ModelCard from '@/components/Modelcard';
import ModelCardSkeleton from '@/components/modelskeleton';


interface ApiModel {
  id: string;
  name?: string;
  description?: string | null;
  version?: string;
  modelType?: string;
  baseModel?: string;
  tags?: string | null;
  downloads?: number;
  fileSize?: number | string;
  createdAt?: string | Date;
  images?: Array<{
    id: string;
    url: string;
    // Add other image properties as needed
  }>;
  user?: {
    name?: string;
    image?: string | null;
  };
}

// Replace 'any' with the proper type
function transformModel(apiModel: ApiModel) {
  return {
    id: apiModel.id,
    name: apiModel.name || '',
    description: apiModel.description || null,
    version: apiModel.version || '1.0',
    modelType: apiModel.modelType || 'Unknown',
    baseModel: apiModel.baseModel || 'Unknown',
    tags: apiModel.tags || null,
    downloads: apiModel.downloads || 0,
    fileSize: BigInt(apiModel.fileSize || 0),
    createdAt: new Date(apiModel.createdAt || Date.now()),
    images: apiModel.images || [],
    user: {
      name: apiModel.user?.name || 'Unknown User',
      image: apiModel.user?.image || null
    }
  };
}


export default function HomePage() {
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['models'],
    queryFn: ({ pageParam = 1 }) => fetchModels(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8">AI Models Explorer</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {status === 'pending' ? (
          // Show skeletons while initially loading
          Array.from({ length: 8 }).map((_, i) => (
            <ModelCardSkeleton key={i} />
          ))
        ) : status === 'error' ? (
          <div className="col-span-full text-center py-10">
            <h3 className="text-xl font-medium text-red-500">
              Error loading models
            </h3>
            <p className="mt-2">Please try again later</p>
          </div>
        ) : (
          // Render the AI models
          data.pages.flatMap((page) => (
            page.models.map((model) => (
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
      {!hasNextPage && status !== 'pending' && (
        <div className="text-center mt-8 text-gray-500">
          No more models to load
        </div>
      )}
    </div>
  );
}