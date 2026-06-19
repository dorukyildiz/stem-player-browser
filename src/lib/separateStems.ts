import * as ort from "onnxruntime-web";
import { DemucsProcessor, CONSTANTS } from "demucs-web";

const TARGET_SR = 44100;

export interface Stems {
    drums: { left: Float32Array; right: Float32Array };
    bass: { left: Float32Array; right: Float32Array };
    other: { left: Float32Array; right: Float32Array };
    vocals: { left: Float32Array; right: Float32Array };
}

// decode the file and resample to 44.1kHz stereo
async function fileToStereo44k(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const tmpCtx = new AudioContext();
    const decoded = await tmpCtx.decodeAudioData(arrayBuffer);
    await tmpCtx.close();

    const length = Math.ceil(decoded.duration * TARGET_SR);
    const offline = new OfflineAudioContext(2, length, TARGET_SR);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();

    const left = rendered.getChannelData(0);
    const right =
        rendered.numberOfChannels > 1 ? rendered.getChannelData(1) : left;
    return { left: new Float32Array(left), right: new Float32Array(right) };
}

export async function separateStems(
    file: File,
    onProgress?: (p: number) => void,
    onDownloadProgress?: (loaded: number, total: number) => void,
): Promise<Stems> {
    ort.env.wasm.wasmPaths =
        "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";

    const { left, right } = await fileToStereo44k(file);

    const processor = new DemucsProcessor({
        ort,
        onProgress: (info) => onProgress?.(info.progress),
        onDownloadProgress: (loaded, total) => onDownloadProgress?.(loaded, total),
        onLog: (phase, msg) => console.log(`[${phase}] ${msg}`),
    });

    // downloads the model (~170MB, cached after first time) from Hugging Face
    await processor.loadModel(CONSTANTS.DEFAULT_MODEL_URL);

    const result = await processor.separate(left, right);
    return result as Stems;
}