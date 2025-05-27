export interface ApiModel {
    id: string;
    name: string;
    description: string | null;
    version: string;
    modelType: string;
    baseModel: string;
    tags: string | null;
    fileUrl: string;
    fileSize: string;  // Changed from bigint | string to just string
    fileName: string;
    magnetURI?: string | null;  // Add torrent magnet link
    infoHash?: string | null;   // Add torrent info hash
    downloads: number;
    createdAt: string | Date;
    images?: Array<{
        id: string;
        url: string;
        isNsfw?: boolean;
    }>;
    user?: {
        id: string;
        name: string;
        image: string | null;
    };
}

export interface ModelImage {
    id: string;
    url: string;
    isNsfw?: boolean;
}

export interface TransformedModel {
    id: string;
    name: string;
    description: string | null;
    version: string;
    modelType: string;
    baseModel: string;
    tags: string | null;
    license?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize: string;  // Changed from bigint to string
    magnetURI?: string | null;  // Add torrent magnet link
    infoHash?: string | null;   // Add torrent info hash
    downloads: number;
    createdAt: Date;
    updatedAt?: Date;
    images: ModelImage[];
    user: {
        id: string;
        name: string;
        image: string | null;
    };
}