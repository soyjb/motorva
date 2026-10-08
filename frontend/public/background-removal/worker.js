import * as ort from "./runtime/ort.wasm.min.mjs";

// Single-thread WASM works without special cross-origin isolation headers.
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = new URL("./runtime/", import.meta.url).href;
let session;
self.onmessage = async ({ data: { pixels } }) => {
  try {
    self.postMessage({ status: "Loading background remover…" });
    session ??= await ort.InferenceSession.create(new URL("./u2netp.onnx", import.meta.url).href, { executionProviders: ["wasm"] });
    self.postMessage({ status: "Separating your vehicle from the background…" });
    const size = 320 * 320;
    const input = new Float32Array(3 * size);
    let maximum = 1;
    for (let i = 0; i < size; i++) for (let c = 0; c < 3; c++) maximum = Math.max(maximum, pixels[i * 4 + c]);
    const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
    for (let c = 0; c < 3; c++) for (let i = 0; i < size; i++) input[c * size + i] = (pixels[i * 4 + c] / maximum - mean[c]) / std[c];
    const outputs = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, 320, 320]) });
    const prediction = outputs[session.outputNames[0]].data;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < size; i++) { min = Math.min(min, prediction[i]); max = Math.max(max, prediction[i]); }
    if (max - min < 0.00001) throw new Error("No subject detected");
    const mask = new Uint8ClampedArray(size);
    for (let i = 0; i < size; i++) mask[i] = Math.round(255 * (prediction[i] - min) / (max - min));
    self.postMessage({ mask }, [mask.buffer]);
  } catch {
    self.postMessage({ error: "Background removal couldn't finish. Your original photo is kept. Try another photo or browser." });
  }
};
