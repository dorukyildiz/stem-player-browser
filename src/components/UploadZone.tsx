import { useRef, useState } from "react";

interface UploadZoneProps {
    onFileSelected: (file: File) => void;
}

const ACCEPTED = [".mp3", ".wav", ".flac", ".m4a", ".ogg"];

export default function UploadZone({ onFileSelected }: UploadZoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);

    const isAudio = (file: File) =>
        file.type.startsWith("audio/") ||
        ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext));

    const handleFile = (file: File | undefined) => {
        if (!file) return;
        if (!isAudio(file)) {
            alert("Unsupported file. Upload MP3, WAV, FLAC, M4A, or OGG.");
            return;
        }
        onFileSelected(file);
    };

    return (
        <div
            className={`upload-zone ${dragActive ? "drag-active" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFile(e.dataTransfer.files[0]);
            }}
        >
            <input
                ref={inputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <p className="upload-title">Drop your audio file here</p>
            <p className="upload-sub">or click to browse · MP3, WAV, FLAC, M4A, OGG</p>
        </div>
    );
}