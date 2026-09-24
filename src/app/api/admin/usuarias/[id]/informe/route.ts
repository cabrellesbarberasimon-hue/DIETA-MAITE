import { NextResponse, type NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import { requireAdmin } from "@/lib/auth/guards";
import { getUsuariaById } from "@/lib/data/usuaria";
import { getRangeSummary } from "@/lib/data/report";
import { fmtDateShort } from "@/lib/format";
import { toDateKey } from "@/lib/nutrition";

/** Informe PDF de seguimiento: macros medias, peso y ejercicio de los últimos N días. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const diasParam = Number(request.nextUrl.searchParams.get("dias"));
  const dias = [7, 30, 90].includes(diasParam) ? diasParam : 30;

  const usuaria = await getUsuariaById(id);
  const resumen = await getRangeSummary(id, dias);

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(20).text("NutriProgress — Informe de seguimiento", { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(12).fillColor("#555").text(`${usuaria.name}`);
  doc.text(`Periodo: últimos ${dias} días (${fmtDateShort(resumen.desde)} – ${fmtDateShort(resumen.hasta)})`);
  doc.text(`Generado el ${fmtDateShort(new Date())}`);
  doc.fillColor("#000");
  doc.moveDown(1.2);

  section(doc, "Cumplimiento");
  doc.text(`${resumen.diasConDatos} de ${resumen.diasTotales} días con al menos una comida registrada.`);
  doc.moveDown(1);

  section(doc, "Macros medias (días con registro)");
  row(doc, "Kcal/día", `${resumen.avgKcal} kcal`);
  row(doc, "Proteína/día", `${resumen.avgProteinaG} g  (objetivo ${resumen.objetivoProteinaG} g)`);
  row(doc, "Carbohidratos/día", `${resumen.avgCarbohidratosG} g`);
  row(doc, "Grasas/día", `${resumen.avgGrasasG} g  (objetivo ${resumen.objetivoGrasasG} g)`);
  row(doc, "Déficit/superávit acumulado", `${resumen.deficitAcumulado >= 0 ? "+" : ""}${resumen.deficitAcumulado} kcal`);
  doc.moveDown(1);

  section(doc, "Peso");
  if (resumen.pesoInicial != null && resumen.pesoFinal != null) {
    const delta = resumen.pesoFinal - resumen.pesoInicial;
    row(doc, "Peso al inicio del periodo", `${resumen.pesoInicial} kg`);
    row(doc, "Peso al final del periodo", `${resumen.pesoFinal} kg`);
    row(doc, "Variación", `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} kg`);
  } else {
    doc.text("Sin registros de peso en este periodo.");
  }
  doc.moveDown(1);

  section(doc, "Ejercicio");
  row(doc, "Sesiones registradas", `${resumen.sesionesEjercicio}`);
  row(doc, "Kcal quemadas (total)", `${resumen.kcalEjercicioTotal} kcal`);

  doc.moveDown(2);
  doc.fontSize(9).fillColor("#999").text(
    "Este informe es una herramienta de apoyo al seguimiento nutricional, no un diagnóstico médico.",
  );

  doc.end();
  const pdfBuffer = await done;

  const filename = `informe-${usuaria.name.replace(/\s+/g, "_")}-${toDateKey(new Date())}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function section(doc: PDFKit.PDFDocument, title: string) {
  doc.fontSize(13).fillColor("#166534").text(title);
  doc.fillColor("#000").fontSize(11);
  doc.moveDown(0.3);
}

function row(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.text(`${label}: `, { continued: true }).font("Helvetica-Bold").text(value).font("Helvetica");
}
