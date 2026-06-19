import * as ort from "onnxruntime-web";
import { DemucsProcessor, CONSTANTS } from "demucs-web";

ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";

const ctx = self as unknown as {
    postMessage: (message: unknown, transfer?: Transferable[]) => void;
    onmessage: ((e: MessageEvent) => void) | null;
};

interface SeparateMessage {
    type: "separate";
    left: Float32Array;
    right: Float32Array;
}

const STEMS = ["drums", "bass", "other", "vocals"] as const;

let processor: DemucsProcessor | null = null;

ctx.onmessage = async (e: MessageEvent) => {
    const msg = e.data as SeparateMessage;
    if (msg.type !== "separate") return;

    try {
        if (!processor) {
            processor = new DemucsProcessor({
                ort,
                onProgress: (info) =>
                    ctx.postMessage({ type: "progress", progress: info.progress }),
                onDownloadProgress: (loaded, total) =>
                    ctx.postMessage({ type: "download", loaded, total }),
            });
            await processor.loadModel(CONSTANTS.DEFAULT_MODEL_URL);
        }

        const result = await processor.separate(msg.left, msg.right);

        const stems: Record<string, { left: Float32Array; right: Float32Array }> = {};
        const transfer: Transferable[] = [];
        for (const name of STEMS) {
            const left = new Float32Array(result[name].left);
            const right = new Float32Array(result[name].right);
            stems[name] = { left, right };
            transfer.push(left.buffer, right.buffer);
        }

        ctx.postMessage({ type: "done", stems }, transfer);
    } catch (err) {
        ctx.postMessage({ type: "error", message: (err as Error).message });
    }
};