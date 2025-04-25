import type { ApiModel } from '@/types/model';


interface PaginatedResponse {
  models: ApiModel[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
    nextPage: number | null;
  };
  nextPage: number | null; // For useInfiniteQuery
}

export async function fetchModels(page: number = 1, limit: number = 12): Promise<PaginatedResponse> {
  try {
    const response = await fetch(`/api/recentmodels?page=${page}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Format the response to match what useInfiniteQuery expects
    return {
      models: data.models,
      pagination: data.pagination,
      nextPage: data.pagination.nextPage,
    };
  } catch (error) {
    console.error("Error fetching models:", error);
    throw new Error("Failed to fetch models");
  }
}