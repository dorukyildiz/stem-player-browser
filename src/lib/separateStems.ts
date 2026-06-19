import type { SeparationResult } from "demucs-web";

const TARGET_SR = 44100;

let worker: Worker | null = null;
function getWorker(): Worker {
    if (!worker) {
        worker = new Worker(new URL("./separationWorker.ts", import.meta.url), {
            type: "module",
        });
    }
    return worker;
}

// decode + resample to 44.1kHz stereo (main thread, fast)
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

    const left = new Float32Array(rendered.getChannelData(0));
    const right =
        rendered.numberOfChannels > 1
            ? new Float32Array(rendered.getChannelData(1))
            : new Float32Array(rendered.getChannelData(0));
    return { left, right };
}

export async function separateStems(
    file: File,
    onProgress?: (p: number) => void,
    onDownloadProgress?: (loaded: number, total: number) => void,
): Promise<SeparationResult> {
    const { left, right } = await fileToStereo44k(file);
    const w = getWorker();

    return new Promise<SeparationResult>((resolve, reject) => {
        const handle = (e: MessageEvent) => {
            const msg = e.data;
            switch (msg.type) {
                case "download":
                    onDownloadProgress?.(msg.loaded, msg.total);
                    break;
                case "progress":
                    onProgress?.(msg.progress);
                    break;
                case "done":
                    w.removeEventListener("message", handle);
                    resolve(msg.stems as SeparationResult);
                    break;
                case "error":
                    w.removeEventListener("message", handle);
                    reject(new Error(msg.message));
                    break;
            }
        };
        w.addEventListener("message", handle);
        w.postMessage({ type: "separate", left, right }, [left.buffer, right.buffer]);
    });
}