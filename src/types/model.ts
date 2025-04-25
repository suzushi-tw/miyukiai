export interface ApiModel {
    id: string;
    name: string;
    description: string | null;
    version: string;
    modelType: string;
    baseModel: string;
    tags: string | null;
    fileUrl: string;
    fileSize: bigint | string;
    fileName: string;
    downloads: number;
    createdAt: string | Date;
    images?: Array<{
        id: string;
        url: string;
    }>;
    user?: {
        id: string;
        name: string;
        image: string | null;
    };
}

export interface TransformedModel {
    id: string;
    name: string;
    description: string | null;
    version: string;
    modelType: string;
    baseModel: string;
    tags: string | null;
    downloads: number;
    fileSize: bigint;
    createdAt: Date;
    images: { url: string }[];
    user: {
        id: string;    // Make sure this matches the User interface in ModelCard
        name: string;
        image: string | null;
    };
}