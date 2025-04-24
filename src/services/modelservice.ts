export interface AIModel {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  parameters: number;
  releaseDate: string;
}

export async function fetchModels(page = 1, limit = 10) {
  // Replace with actual API call
  // This is a mock implementation
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
  
  // Mock data generator
  const models: AIModel[] = Array.from({ length: limit }, (_, i) => {
    const id = (page - 1) * limit + i + 1;
    return {
      id: `model-${id}`,
      name: `AI Model ${id}`,
      description: `A powerful language model with advanced capabilities in text generation and understanding.`,
      category: ['Text', 'Image', 'Audio', 'Multimodal'][Math.floor(Math.random() * 4)],
      imageUrl: `https://picsum.photos/seed/${id}/300/200`,
      parameters: Math.pow(10, Math.floor(Math.random() * 4) + 9),
      releaseDate: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0]
    };
  });

  const hasMore = page < 5; // Limit to 5 pages for demo purposes
  
  return {
    models,
    nextPage: hasMore ? page + 1 : null,
    hasMore
  };
}