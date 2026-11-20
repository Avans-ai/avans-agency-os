import type { PdfExtractor } from "./extraction";
import { INTAKE_LIMITS } from "./extraction";
export const extractPdf: PdfExtractor = async (bytes) => {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
  const loading = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    stopAtErrors: true,
  });
  try {
    const doc = await loading.promise;
    if (doc.numPages > INTAKE_LIMITS.pdfPages)
      throw new Error("El PDF supera el límite de 100 páginas.");
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        `Página ${i}\n` +
          content.items
            .map((item) =>
              "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
            )
            .join(""),
      );
      if (pages.join("").length > INTAKE_LIMITS.textCharacters) break;
    }
    const text = pages.join("\n\n");
    if (!text.replace(/Página \d+/g, "").trim())
      throw new Error(
        "El PDF no contiene texto extraíble. OCR no configurado.",
      );
    return { text, pages: doc.numPages, warnings: [] };
  } catch (error) {
    if (error instanceof Error && /password/i.test(error.name))
      throw new Error("El PDF está protegido con contraseña.");
    throw error;
  } finally {
    await loading.destroy();
  }
};
