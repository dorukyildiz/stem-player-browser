import { useState } from "react";
import type { SeparationResult } from "demucs-web";
import UploadZone from "./components/UploadZone";
import Player from "./components/Player";
import StemMixer from "./components/StemMixer";
import { separateStems } from "./lib/separateStems";

export default function App() {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [stems, setStems] = useState<SeparationResult | null>(null);
    const [status, setStatus] = useState("");

    const reset = () => { setAudioFile(null); setStems(null); setStatus(""); };

    const handleSeparate = async () => {
        if (!audioFile) return;
        try {
            setStatus("loading model…");
            const result = await separateStems(
                audioFile,
                (p) => setStatus(`separating… ${Math.round(p * 100)}%`),
                (loaded, total) =>
                    setStatus(`downloading model… ${Math.round((loaded / total) * 100)}%`),
            );
            setStems(result);
            setStatus("");
        } catch (err) {
            console.error(err);
            setStatus(`error: ${(err as Error).message}`);
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
                                    <button className="primary-btn" onClick={handleSeparate}>
                                        Separate into stems
                                    </button>
                                    {status && <span className="status">{status}</span>}
                                </div>
                            </>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}