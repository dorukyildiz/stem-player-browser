import { useAudioPlayer } from "../hooks/useAudioPlayer";

interface PlayerProps {
    file: File;
}

function formatTime(s: number) {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function Player({ file }: PlayerProps) {
    const { isReady, isPlaying, currentTime, duration, play, pause, seek } =
        useAudioPlayer(file);

    if (!isReady) {
        return <div className="player"><p className="status">Decoding audio…</p></div>;
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
                type="range"
                className="seek"
                min={0}
                max={duration}
                step={0.01}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                style={{
                    background: `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)`,
                }}
            />
        </div>
    );
}