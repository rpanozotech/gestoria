type WorkerFactory = (...args: any[]) => Promise<any>;

export async function prepareImageForOcr(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 2600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    return canvas;
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Mejora documentos fotografiados: escala de grises, contraste y umbral
  // suave. Conservamos la imagen en el canvas, no modificamos el archivo.
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < image.data.length; i += 4) {
    const luminance = 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2];
    const contrast = Math.max(0, Math.min(255, (luminance - 128) * 1.35 + 128));
    image.data[i] = contrast;
    image.data[i + 1] = contrast;
    image.data[i + 2] = contrast;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

export async function startLocalOcrWorker(createWorker: WorkerFactory, onProgress: (message: string) => void) {
  const worker = await createWorker('spa+eng+nld', 1, {
    logger: (event: { status?: string; progress?: number }) => {
      if (event?.status) {
        const progress = typeof event.progress === 'number' ? ` ${Math.round(event.progress * 100)}%` : '';
        onProgress(`${event.status}${progress}`);
      }
    },
  });
  return worker;
}
