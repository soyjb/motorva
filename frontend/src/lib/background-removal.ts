"use client";

export async function removePhotoBackground(photo: string, signal: AbortSignal, progress: (message: string) => void): Promise<Blob> {
  signal.throwIfAborted();
  const bitmap = await createImageBitmap(await (await fetch(photo)).blob());
  let worker: Worker | undefined;
  try {
    signal.throwIfAborted();
    const small = document.createElement("canvas");
    small.width = 320; small.height = 320;
    const context = small.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Photo processing isn't available in this browser.");
    context.fillStyle = "white"; context.fillRect(0, 0, 320, 320);
    context.drawImage(bitmap, 0, 0, 320, 320);
    const pixels = context.getImageData(0, 0, 320, 320).data;
    worker = new Worker("/background-removal/worker.js", { type: "module" });
    const mask = await new Promise<Uint8ClampedArray>((resolve, reject) => {
      const activeWorker = worker!;
      const abort = () => { finish(); activeWorker.terminate(); reject(new DOMException("Cancelled", "AbortError")); };
      signal.addEventListener("abort", abort, { once: true });
      const finish = () => { clearTimeout(timeout); signal.removeEventListener("abort", abort); };
      const timeout = setTimeout(() => { finish(); activeWorker.terminate(); reject(new Error("Background removal took too long. Your original photo is kept.")); }, 120000);
      activeWorker.onerror = () => { finish(); reject(new Error("Background removal isn't available in this browser. Your original photo is kept.")); };
      activeWorker.onmessage = ({ data }) => {
        if (data.status) progress(data.status);
        else if (data.error) { finish(); reject(new Error(data.error)); }
        else if (data.mask) { finish(); resolve(data.mask); }
      };
      activeWorker.postMessage({ pixels }, [pixels.buffer]);
    });
    signal.throwIfAborted();
    const maskImage = context.createImageData(320, 320);
    for (let i = 0; i < mask.length; i++) {
      maskImage.data[i * 4] = 255; maskImage.data[i * 4 + 1] = 255; maskImage.data[i * 4 + 2] = 255; maskImage.data[i * 4 + 3] = mask[i];
    }
    context.putImageData(maskImage, 0, 0);
    const output = document.createElement("canvas");
    output.width = bitmap.width; output.height = bitmap.height;
    const result = output.getContext("2d");
    if (!result) throw new Error("Photo processing isn't available.");
    result.drawImage(bitmap, 0, 0);
    result.globalCompositeOperation = "destination-in";
    result.drawImage(small, 0, 0, output.width, output.height);
    return await new Promise<Blob>((resolve, reject) => output.toBlob(blob => blob ? resolve(blob) : reject(new Error("Couldn't prepare the cutout.")), "image/png"));
  } finally { bitmap.close(); worker?.terminate(); }
}
