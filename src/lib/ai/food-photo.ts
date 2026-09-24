import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export function foodPhotoAnalysisIsConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const AnalysisSchema = z.object({
  reconocido: z.boolean().describe("false si la imagen no muestra comida reconocible"),
  nombre: z.string().describe("Nombre corto y descriptivo del plato o alimento, en español"),
  kcal: z.number().min(0),
  proteinaG: z.number().min(0),
  carbohidratosG: z.number().min(0),
  grasasG: z.number().min(0),
  notas: z.string().describe("Aviso breve de que es una estimación aproximada, en español"),
});

export type FoodPhotoAnalysis = z.infer<typeof AnalysisSchema>;

const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

function isSupportedMediaType(value: string): value is SupportedMediaType {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(value);
}

/**
 * Analiza una foto de comida con Claude (visión) y devuelve una estimación
 * de macros. Es solo una ayuda para rellenar el formulario más rápido: la
 * usuaria siempre revisa y confirma los valores antes de guardar, nunca se
 * guarda nada automáticamente a partir de esto.
 */
export async function analyzeFoodPhoto(base64Image: string, mediaType: string): Promise<FoodPhotoAnalysis> {
  if (!foodPhotoAnalysisIsConfigured()) {
    throw new Error("El reconocimiento de comida por foto no está configurado (falta ANTHROPIC_API_KEY).");
  }
  if (!isSupportedMediaType(mediaType)) {
    throw new Error("Formato de imagen no soportado. Usa JPEG, PNG, WEBP o GIF.");
  }

  const client = new Anthropic();

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 1024,
      system:
        "Eres un asistente nutricional. A partir de una foto de un plato de comida, identifica qué es y estima " +
        "sus macronutrientes totales (para la ración completa que se ve en la foto, no por 100 g). Da tu mejor " +
        "estimación razonada aunque no puedas estar seguro del todo; solo marca reconocido=false si la imagen " +
        "claramente no muestra comida.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
            { type: "text", text: "¿Qué es esta comida y cuáles son sus macros aproximados (para toda la ración)?" },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(AnalysisSchema) },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error("La IA no está bien configurada (clave inválida). Avisa a Simón para que lo revise.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error("La IA está saturada ahora mismo. Prueba de nuevo en un momento.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error("La IA no ha podido analizar la foto. Prueba de nuevo o rellena los datos a mano.");
    }
    throw err;
  }

  if (!response.parsed_output) {
    throw new Error("No se ha podido interpretar la respuesta de la IA. Prueba de nuevo.");
  }
  return response.parsed_output;
}
