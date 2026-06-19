import { useEffect, useRef, useState } from "react";
import type { SeparationResult } from "demucs-web";

export type StemName = "vocals" | "drums" | "bass" | "other";
export const STEM_NAMES: StemName[] = ["vocals", "drums", "bass", "other"];
const SAMPLE_RATE = 44100;

interface StemState { volume: number; muted: boolean; solo: boolean; }
type StemStates = Record<StemName, StemState>;

const initialStates = (): StemStates => ({
    vocals: { volume: 1, muted: false, solo: false },
    drums: { volume: 1, muted: false, solo: false },
    bass: { volume: 1, muted: false, solo: false },
    other: { volume: 1, muted: false, solo: false },
});

function applyGains(states: StemStates, gains: Record<StemName, GainNode>) {
    const anySolo = STEM_NAMES.some((n) => states[n].solo);
    for (const n of STEM_NAMES) {
        const s = states[n];
        let g = s.volume;
        if (anySolo && !s.solo) g = 0;
        if (s.muted) g = 0;
        gains[n].gain.value = g;
    }
}

export function useStemPlayer(stems: SeparationResult | null) {
    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [stemStates, setStemStates] = useState<StemStates>(initialStates);

    const ctxRef = useRef<AudioContext | null>(null);
    const buffersRef = useRef<Record<StemName, AudioBuffer> | null>(null);
    const gainsRef = useRef<Record<StemName, GainNode> | null>(null);
    const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const startedAtRef = useRef(0);
    const offsetRef = useRef(0);
    const isPlayingRef = useRef(false);
    const rafRef = useRef<number | null>(null);

    const stopRaf = () => {
        if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };

    const stopAllSources = () => {
        for (const src of sourcesRef.current) {
            src.onended = null;
            try { src.stop(); } catch { /* already stopped */ }
            src.disconnect();
        }
        sourcesRef.current = [];
    };

    const tick = () => {
        const ctx = ctxRef.current;
        const buffers = buffersRef.current;
        if (ctx && buffers && isPlayingRef.current) {
            const t = offsetRef.current + (ctx.currentTime - startedAtRef.current);
            setCurrentTime(Math.min(Math.max(t, 0), buffers.vocals.duration));
            rafRef.current = requestAnimationFrame(tick);
        }
    };

    const play = () => {
        const ctx = ctxRef.current;
        const buffers = buffersRef.current;
        const gains = gainsRef.current;
        if (!ctx || !buffers || !gains || isPlayingRef.current) return;
        if (ctx.state === "suspended") void ctx.resume();

        const startAt = ctx.currentTime + 0.05;
        const sources: AudioBufferSourceNode[] = [];
        for (const n of STEM_NAMES) {
            const src = ctx.createBufferSource();
            src.buffer = buffers[n];
            src.connect(gains[n]);
            src.start(startAt, offsetRef.current);
            sources.push(src);
        }
        sources[0].onended = () => {
            offsetRef.current = 0;
            isPlayingRef.current = false;
            sourcesRef.current = [];
            stopRaf();
            setIsPlaying(false);
            setCurrentTime(0);
        };

        sourcesRef.current = sources;
        startedAtRef.current = startAt;
        isPlayingRef.current = true;
        setIsPlaying(true);
        rafRef.current = requestAnimationFrame(tick);
    };

    const pause = () => {
        const ctx = ctxRef.current;
        if (!ctx || !isPlayingRef.current) return;
        offsetRef.current = Math.max(0, offsetRef.current + ctx.currentTime - startedAtRef.current);
        stopAllSources();
        isPlayingRef.current = false;
        setIsPlaying(false);
        stopRaf();
        setCurrentTime(offsetRef.current);
    };

    const seek = (time: number) => {
        const buffers = buffersRef.current;
        if (!buffers) return;
        const wasPlaying = isPlayingRef.current;
        stopAllSources();
        isPlayingRef.current = false;
        stopRaf();
        offsetRef.current = Math.max(0, Math.min(time, buffers.vocals.duration));
        setCurrentTime(offsetRef.current);
        setIsPlaying(false);
        if (wasPlaying) play();
    };

    const setStemVolume = (name: StemName, v: number) =>
        setStemStates((s) => ({ ...s, [name]: { ...s[name], volume: v } }));
    const toggleMute = (name: StemName) =>
        setStemStates((s) => ({ ...s, [name]: { ...s[name], muted: !s[name].muted } }));
    const toggleSolo = (name: StemName) =>
        setStemStates((s) => ({ ...s, [name]: { ...s[name], solo: !s[name].solo } }));

    // build the audio graph when stems arrive
    useEffect(() => {
        if (!stems) return;

        const ctx = new AudioContext();
        const master = ctx.createGain();
        master.connect(ctx.destination);

        const buffers = {} as Record<StemName, AudioBuffer>;
        const gains = {} as Record<StemName, GainNode>;
        for (const n of STEM_NAMES) {
            const stem = stems[n];
            const buf = ctx.createBuffer(2, stem.left.length, SAMPLE_RATE);
            buf.getChannelData(0).set(stem.left);
            buf.getChannelData(1).set(stem.right);
            buffers[n] = buf;
            const g = ctx.createGain();
            g.connect(master);
            gains[n] = g;
        }

        ctxRef.current = ctx;
        buffersRef.current = buffers;
        gainsRef.current = gains;
        offsetRef.current = 0;
        isPlayingRef.current = false;
        applyGains(stemStates, gains);

        /* eslint-disable react-hooks/set-state-in-effect */
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(buffers.vocals.duration);
        setIsReady(true);
        /* eslint-enable react-hooks/set-state-in-effect */

        return () => {
            stopAllSources();
            stopRaf();
            void ctx.close();
        };
    }, [stems]);

    // re-apply gains when stem states change
    useEffect(() => {
        if (gainsRef.current) applyGains(stemStates, gainsRef.current);
    }, [stemStates]);

    return {
        isReady, isPlaying, currentTime, duration, stemStates,
        play, pause, seek, setStemVolume, toggleMute, toggleSolo,
    };
}