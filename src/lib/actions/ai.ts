"use server";

import { z } from "zod";
import { requireUsuaria } from "@/lib/auth/guards";
import { analyzeFoodPhoto } from "@/lib/ai/food-photo";

const analyzeSchema = z.object({
  base64Image: z.string().min(1),
  mediaType: z.string().min(1),
});

export async function analyzeFoodPhotoAction(input: z.infer<typeof analyzeSchema>) {
  await requireUsuaria();
  const { base64Image, mediaType } = analyzeSchema.parse(input);
  const result = await analyzeFoodPhoto(base64Image, mediaType);
  if (!result.reconocido) {
    throw new Error("No se ha reconocido comida en la foto. Prueba con otra imagen o rellena los datos a mano.");
  }
  return result;
}
