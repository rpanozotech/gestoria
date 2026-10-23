type WorkerFactory = (...args: any[]) => Promise<any>;

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
