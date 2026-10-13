/**
 * Converts an SVG element to a PNG Blob using an offscreen canvas.
 * Clones the SVG and inlines computed styles so that Shadow DOM
 * styles are preserved in the exported image.
 */
export async function exportToPng(svgElement: SVGElement, scale = 2): Promise<Blob> {
  // Clone the SVG to add inline styles (needed since Shadow DOM styles won't apply)
  const clone = svgElement.cloneNode(true) as SVGElement;

  // Inline all computed styles
  inlineStyles(svgElement, clone);

  // Get dimensions
  const bbox = svgElement.getBoundingClientRect();
  const width = bbox.width * scale;
  const height = bbox.height * scale;

  clone.setAttribute('width', String(bbox.width));
  clone.setAttribute('height', String(bbox.height));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Serialize to string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create PNG blob'));
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG as image'));
    };
    img.src = url;
  });
}

/**
 * Recursively copies a curated set of computed CSS properties from a
 * source element tree onto the corresponding target (cloned) element
 * tree so the visual output survives serialization.
 */
function inlineStyles(source: Element, target: Element): void {
  const computed = window.getComputedStyle(source);
  const important = [
    'fill',
    'stroke',
    'stroke-width',
    'stroke-dasharray',
    'stroke-linecap',
    'stroke-linejoin',
    'font-family',
    'font-size',
    'font-weight',
    'text-anchor',
    'dominant-baseline',
    'opacity',
    'transform',
    'color',
    'visibility',
    'display',
  ];
  for (const prop of important) {
    const value = computed.getPropertyValue(prop);
    if (value) {
      (target as HTMLElement).style.setProperty(prop, value);
    }
  }
  // Recurse children
  for (let i = 0; i < source.children.length && i < target.children.length; i++) {
    inlineStyles(source.children[i], target.children[i]);
  }
}

/**
 * Exports an SVG element as a PNG file and triggers a browser download.
 */
export async function downloadPng(svgElement: SVGElement, filename = 'genogram.png', scale = 2): Promise<void> {
  const blob = await exportToPng(svgElement, scale);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}
