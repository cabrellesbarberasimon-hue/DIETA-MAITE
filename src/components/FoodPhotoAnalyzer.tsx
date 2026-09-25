"use client";

import { useRef, useState } from "react";
import { analyzeFoodPhotoAction, analyzeNutritionLabelAction } from "@/lib/actions/ai";
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

type Mode = "plato" | "etiqueta";

type PlatoResult = { nombre: string; kcal: number; proteinaG: number; carbohidratosG: number; grasasG: number; notas: string };
type EtiquetaResult = {
  nombre: string;
  kcal100: number;
  proteinaG100: number;
  carbohidratosG100: number;
  grasasG100: number;
  notas: string;
};

/**
 * Analiza una foto con IA (Claude, visión) y propone macros para rellenar
 * el formulario de "Otro alimento". Dos modos: foto del plato (macros de
 * toda la ración) o foto de la etiqueta nutricional de un envase (valores
 * por 100 g/ml, con gramos a introducir para calcular el consumo). Nunca
 * guarda nada por sí sola: la usuaria siempre revisa y confirma antes de
 * guardar, igual que con el buscador de alimentos o la biblioteca de platos.
 */
export function FoodPhotoAnalyzer({ onApply }: { onApply: (values: FoodPickerValues) => void }) {
  const [mode, setMode] = useState<Mode>("plato");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [platoResult, setPlatoResult] = useState<PlatoResult | null>(null);
  const [etiquetaResult, setEtiquetaResult] = useState<EtiquetaResult | null>(null);
  const [gramos, setGramos] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function changeMode(next: Mode) {
    setMode(next);
    reset();
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPlatoResult(null);
    setEtiquetaResult(null);
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
      if (mode === "plato") {
        const analysis = await analyzeFoodPhotoAction({ base64Image: base64, mediaType: "image/jpeg" });
        setPlatoResult(analysis);
      } else {
        setGramos(100);
        const analysis = await analyzeNutritionLabelAction({ base64Image: base64, mediaType: "image/jpeg" });
        setEtiquetaResult(analysis);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido analizar la foto.");
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setPreviewUrl(null);
    setBase64(null);
    setPlatoResult(null);
    setEtiquetaResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const hasResult = platoResult !== null || etiquetaResult !== null;
  const factor = gramos / 100;
  const round1 = (v: number) => Math.round(v * factor * 10) / 10;
  const etiquetaPreview = etiquetaResult
    ? {
        kcal: Math.round(etiquetaResult.kcal100 * factor),
        proteinaG: round1(etiquetaResult.proteinaG100),
        carbohidratosG: round1(etiquetaResult.carbohidratosG100),
        grasasG: round1(etiquetaResult.grasasG100),
      }
    : null;

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

      {!previewUrl && (
        <div className="mt-1.5 mb-1.5 flex gap-1.5">
          <button
            type="button"
            onClick={() => changeMode("plato")}
            className={`flex-1 rounded-lg py-1 text-xs font-medium ${
              mode === "plato" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            🍽️ Foto del plato
          </button>
          <button
            type="button"
            onClick={() => changeMode("etiqueta")}
            className={`flex-1 rounded-lg py-1 text-xs font-medium ${
              mode === "etiqueta" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            🏷️ Foto de etiqueta
          </button>
        </div>
      )}

      {!previewUrl ? (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="w-full text-xs text-slate-500"
        />
      ) : (
        <div className="mt-2 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- previsualización local (data URL), no una imagen servida por Next */}
          <img
            src={previewUrl}
            alt={mode === "plato" ? "Foto del plato" : "Foto de la etiqueta nutricional"}
            className="h-32 w-full rounded-lg object-cover"
          />

          {!hasResult && (
            <button
              type="button"
              disabled={analyzing}
              onClick={analizar}
              className="w-full rounded-lg bg-slate-800 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {analyzing ? "Analizando…" : "Analizar con IA"}
            </button>
          )}

          {platoResult && (
            <div className="rounded-lg border border-green-200 bg-green-50/60 p-2">
              <p className="font-medium text-slate-700">{platoResult.nombre}</p>
              <p className="text-xs text-slate-500">
                {Math.round(platoResult.kcal)} kcal · P{Math.round(platoResult.proteinaG)} C
                {Math.round(platoResult.carbohidratosG)} G{Math.round(platoResult.grasasG)}
              </p>
              <p className="mt-1 text-xs text-amber-600">
                ⚠ {platoResult.notas || "Estimación aproximada por IA — revisa los valores."}
              </p>
              <button
                type="button"
                onClick={() => {
                  onApply({
                    nombre: platoResult.nombre,
                    kcal: Math.round(platoResult.kcal),
                    proteinaG: Math.round(platoResult.proteinaG * 10) / 10,
                    carbohidratosG: Math.round(platoResult.carbohidratosG * 10) / 10,
                    grasasG: Math.round(platoResult.grasasG * 10) / 10,
                  });
                  reset();
                }}
                className="mt-2 w-full rounded-lg bg-green-600 py-1.5 text-xs font-medium text-white"
              >
                Usar esta estimación
              </button>
            </div>
          )}

          {etiquetaResult && etiquetaPreview && (
            <div className="rounded-lg border border-green-200 bg-green-50/60 p-2">
              <p className="font-medium text-slate-700">{etiquetaResult.nombre}</p>
              <p className="text-xs text-slate-500">
                Por 100 g: {Math.round(etiquetaResult.kcal100)} kcal · P{Math.round(etiquetaResult.proteinaG100)} C
                {Math.round(etiquetaResult.carbohidratosG100)} G{Math.round(etiquetaResult.grasasG100)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={gramos}
                  onChange={(e) => setGramos(Math.max(1, Number(e.target.value) || 0))}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
                <span className="text-xs text-slate-500">g comidos</span>
                <span className="flex-1 text-xs text-slate-500">
                  {etiquetaPreview.kcal} kcal · P{etiquetaPreview.proteinaG} C{etiquetaPreview.carbohidratosG} G
                  {etiquetaPreview.grasasG}
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-600">
                ⚠ {etiquetaResult.notas || "Revisa que los valores leídos coincidan con la etiqueta."}
              </p>
              <button
                type="button"
                onClick={() => {
                  onApply({ nombre: `${etiquetaResult.nombre} (${gramos} g)`, ...etiquetaPreview });
                  reset();
                }}
                className="mt-2 w-full rounded-lg bg-green-600 py-1.5 text-xs font-medium text-white"
              >
                Usar
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
