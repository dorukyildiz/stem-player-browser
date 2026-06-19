import type { SeparationResult } from "demucs-web";
import { useStemPlayer, STEM_NAMES, type StemName } from "../hooks/useStemPlayer";

function formatTime(s: number) {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

const LABELS: Record<StemName, string> = {
    vocals: "Vocals", drums: "Drums", bass: "Bass", other: "Other",
};

export default function StemMixer({ stems }: { stems: SeparationResult }) {
    const {
        isReady, isPlaying, currentTime, duration, stemStates,
        play, pause, seek, setStemVolume,
    } = useStemPlayer(stems);

    if (!isReady) {
        return <div className="player"><p className="status">Loading stems…</p></div>;
    }

    const pct = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div className="player">
            <div className="transport">
                <button className="play-btn" onClick={isPlaying ? pause : play}>
                    {isPlaying ? "❚❚" : "▶"}
                </button>
                <span className="time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
            </div>
            <input
                type="range" className="seek" min={0} max={duration} step={0.01}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                style={{ background: `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)` }}
            />

            <div className="stems">
                {STEM_NAMES.map((name) => {
                    const vol = stemStates[name].volume;
                    const vpct = vol * 100;
                    return (
                        <div className="stem-row" key={name}>
                            <span className="stem-name">{LABELS[name]}</span>
                            <input
                                type="range" className="seek stem-slider" min={0} max={1} step={0.01}
                                value={vol}
                                onChange={(e) => setStemVolume(name, parseFloat(e.target.value))}
                                style={{ background: `linear-gradient(to right, var(--accent) ${vpct}%, var(--border) ${vpct}%)` }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}