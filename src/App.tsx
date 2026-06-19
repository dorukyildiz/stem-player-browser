import { useState } from "react";
import type { SeparationResult } from "demucs-web";
import UploadZone from "./components/UploadZone";
import Player from "./components/Player";
import StemMixer from "./components/StemMixer";
import { separateStems } from "./lib/separateStems";

interface Progress { label: string; value: number; }

export default function App() {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [stems, setStems] = useState<SeparationResult | null>(null);
    const [progress, setProgress] = useState<Progress | null>(null);
    const [error, setError] = useState("");

    const reset = () => {
        setAudioFile(null);
        setStems(null);
        setProgress(null);
        setError("");
    };

    const handleSeparate = async () => {
        if (!audioFile) return;
        setError("");
        setProgress({ label: "Loading model", value: 0 });
        try {
            const result = await separateStems(
                audioFile,
                (p) => setProgress({ label: "Separating", value: p }),
                (loaded, total) =>
                    setProgress({ label: "Downloading model", value: total ? loaded / total : 0 }),
            );
            setStems(result);
            setProgress(null);
        } catch (err) {
            console.error(err);
            setError((err as Error).message);
            setProgress(null);
        }
    };

    return (
        <div className="app">
            <header className="app-header">
                <h1 className="logo">stem <span>player</span> browser</h1>
            </header>

            <main className="app-main">
                {!audioFile ? (
                    <UploadZone onFileSelected={setAudioFile} />
                ) : (
                    <section className="player-panel">
                        <div className="track-bar">
                            <span className="track-name">{audioFile.name}</span>
                            <button className="ghost-btn" onClick={reset}>change</button>
                        </div>

                        {stems ? (
                            <StemMixer stems={stems} />
                        ) : (
                            <>
                                <Player file={audioFile} />
                                <div className="separate-bar">
                                    {progress ? (
                                        <div className="progress">
                                            <div className="progress-label">
                                                <span>{progress.label}</span>
                                                <span>{Math.round(progress.value * 100)}%</span>
                                            </div>
                                            <div className="progress-track">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${progress.value * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <button className="primary-btn" onClick={handleSeparate}>
                                            Separate into stems
                                        </button>
                                    )}
                                    {error && <span className="status error">{error}</span>}
                                </div>
                            </>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}