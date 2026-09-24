"use client";

import { useRef, useState } from "react";
import { analyzeFoodPhotoAction } from "@/lib/actions/ai";
import type { FoodPickerValues } from "@/components/FoodPicker";

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.75;

function compressImage(file: File): Promise<{ base64: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se ha podido leer la imagen."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Archivo de imagen no válido."));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se ha podido procesar la imagen."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        resolve({ base64: dataUrl.split(",")[1], previewUrl: dataUrl });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

type Result = { nombre: string; kcal: number; proteinaG: number; carbohidratosG: number; grasasG: number; notas: string };

/**
 * Analiza una foto del plato con IA (Claude, visión) y propone una
 * estimación de macros para toda la ración. Nunca guarda nada por sí sola:
 * solo rellena el formulario de "Otro alimento" para que la usuaria revise
 * y confirme (o corrija) antes de guardar, igual que con el buscador de
 * alimentos o la biblioteca de platos.
 */
export function FoodPhotoAnalyzer({ onApply }: { onApply: (values: FoodPickerValues) => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      const { base64, previewUrl } = await compressImage(file);
      setBase64(base64);
      setPreviewUrl(previewUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido procesar la imagen.");
    }
  }

  async function analizar() {
    if (!base64) return;
    setAnalyzing(true);
    setError(null);
    try {
      const analysis = await analyzeFoodPhotoAction({ base64Image: base64, mediaType: "image/jpeg" });
      setResult(analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido analizar la foto.");
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setPreviewUrl(null);
    setBase64(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">📷 Registrar por foto (con IA)</span>
        {previewUrl && (
          <button type="button" onClick={reset} className="text-xs text-slate-400 underline">
            quitar foto
          </button>
        )}
      </div>

      {!previewUrl ? (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="mt-1 w-full text-xs text-slate-500"
        />
      ) : (
        <div className="mt-2 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- previsualización local (data URL), no una imagen servida por Next */}
          <img src={previewUrl} alt="Foto de la comida" className="h-32 w-full rounded-lg object-cover" />

          {!result && (
            <button
              type="button"
              disabled={analyzing}
              onClick={analizar}
              className="w-full rounded-lg bg-slate-800 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {analyzing ? "Analizando…" : "Analizar con IA"}
            </button>
          )}

          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50/60 p-2">
              <p className="font-medium text-slate-700">{result.nombre}</p>
              <p className="text-xs text-slate-500">
                {Math.round(result.kcal)} kcal · P{Math.round(result.proteinaG)} C
                {Math.round(result.carbohidratosG)} G{Math.round(result.grasasG)}
              </p>
              <p className="mt-1 text-xs text-amber-600">⚠ {result.notas || "Estimación aproximada por IA — revisa los valores."}</p>
              <button
                type="button"
                onClick={() => {
                  onApply({
                    nombre: result.nombre,
                    kcal: Math.round(result.kcal),
                    proteinaG: Math.round(result.proteinaG * 10) / 10,
                    carbohidratosG: Math.round(result.carbohidratosG * 10) / 10,
                    grasasG: Math.round(result.grasasG * 10) / 10,
                  });
                  reset();
                }}
                className="mt-2 w-full rounded-lg bg-green-600 py-1.5 text-xs font-medium text-white"
              >
                Usar esta estimación
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
