/**
 * Exports an SVG element to a PDF file using the jsPDF library.
 * jsPDF is loaded lazily so that the dependency is only required
 * when PDF export is actually invoked. If jsPDF is not installed a
 * clear error message is thrown.
 */
export async function exportToPdf(svgElement: SVGElement, filename = 'genogram.pdf'): Promise<void> {
  let jsPDF: any;
  try {
    // @ts-ignore - jspdf is an optional dependency
    const module = await import(/* webpackIgnore: true */ 'jspdf');
    jsPDF = module.default || module.jsPDF;
  } catch {
    throw new Error(
      'jsPDF is required for PDF export. Install it with: npm install jspdf'
    );
  }

  const bbox = svgElement.getBoundingClientRect();
  const isLandscape = bbox.width > bbox.height;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'px',
    format: [bbox.width, bbox.height],
  });

  // Use SVG -> PNG -> PDF approach
  const { exportToPng } = await import('./export-png');
  const pngBlob = await exportToPng(svgElement, 2);

  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => {
      try {
        doc.addImage(reader.result as string, 'PNG', 0, 0, bbox.width, bbox.height);
        doc.save(filename);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(pngBlob);
  });
}
