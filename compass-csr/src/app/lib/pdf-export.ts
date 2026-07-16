import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

// html2pdf.js bundles an outdated html2canvas that throws on oklch()/oklab()
// colors — which Tailwind v4's default palette (bg-orange-50, text-emerald-700,
// etc.) generates and which Chrome now returns from getComputedStyle. We get
// html2pdf.js's exact settings (margin 10, jpeg 0.98, scale 2, a4 portrait mm)
// by driving html2canvas-pro (a maintained fork with oklch support) + jsPDF
// directly, with the same paginate-a-tall-canvas-across-pages technique
// html2pdf.js uses internally.
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, { scale: 2 });
  const imgData = canvas.toDataURL("image/jpeg", 0.98);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const imgHeightMm = (canvas.height * usableWidth) / canvas.width;

  let heightLeft = imgHeightMm;
  let renderedHeight = 0;

  pdf.addImage(imgData, "JPEG", margin, margin, usableWidth, imgHeightMm);
  heightLeft -= usableHeight;

  while (heightLeft > 0) {
    renderedHeight += usableHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", margin, margin - renderedHeight, usableWidth, imgHeightMm);
    heightLeft -= usableHeight;
  }

  pdf.save(filename);
}

export function buildPdfFilename(prefix: string, name: string): string {
  const safeName =
    name
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "Untitled";
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}-${safeName}-${date}.pdf`;
}
