import { db } from "@/lib/prisma"
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const model = await db.model.findUnique({
    where: {
      id: id,
    },
    include: {
      images: {
        orderBy: {
          createdAt: 'asc', // Or another suitable order
        },
      },
      user: true, // Include user to potentially show author
    },
  });

  if (!model) {
    notFound(); // Render a 404 page if the model is not found
  }


  return (
    <div>My Post: {id}</div>
    
  ) 
}