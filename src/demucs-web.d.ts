declare module "demucs-web" {
    export interface ProgressInfo {
        progress: number;
        currentSegment: number;
        totalSegments: number;
    }

    export interface DemucsProcessorOptions {
        ort: typeof import("onnxruntime-web");
        modelPath?: string;
        sessionOptions?: Record<string, unknown>;
        onProgress?: (info: ProgressInfo) => void;
        onLog?: (phase: string, message: string) => void;
        onDownloadProgress?: (loaded: number, total: number) => void;
    }

    export interface StemChannel {
        left: Float32Array;
        right: Float32Array;
    }

    export interface SeparationResult {
        drums: StemChannel;
        bass: StemChannel;
        other: StemChannel;
        vocals: StemChannel;
    }

    export class DemucsProcessor {
        constructor(options: DemucsProcessorOptions);
        loadModel(pathOrBuffer?: string | ArrayBuffer): Promise<void>;
        separate(left: Float32Array, right: Float32Array): Promise<SeparationResult>;
    }

    export const CONSTANTS: {
        DEFAULT_MODEL_URL: string;
        [key: string]: unknown;
    };
}