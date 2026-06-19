import { useState } from "react";
import UploadZone from "./components/UploadZone";

export default function App() {
    const [audioFile, setAudioFile] = useState<File | null>(null);

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
                            <button className="ghost-btn" onClick={() => setAudioFile(null)}>
                                change
                            </button>
                        </div>
                        <div className="player-placeholder">
                            <p>stem player goes here</p>
                            <span>(next step: separation + mixer)</span>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}