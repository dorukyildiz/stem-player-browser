import { useEffect, useRef, useState } from "react";

export function useAudioPlayer(file: File | null) {
    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const ctxRef = useRef<AudioContext | null>(null);
    const gainRef = useRef<GainNode | null>(null);
    const bufferRef = useRef<AudioBuffer | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const startedAtRef = useRef(0);   // ctx.currentTime when current source started
    const offsetRef = useRef(0);      // position in buffer where it started
    const isPlayingRef = useRef(false);
    const rafRef = useRef<number | null>(null);

    const getCtx = () => {
        if (!ctxRef.current) {
            const ctx = new AudioContext();
            const gain = ctx.createGain();
            gain.connect(ctx.destination);
            ctxRef.current = ctx;
            gainRef.current = gain;
        }
        return ctxRef.current;
    };

    const stopRaf = () => {
        if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    };

    const tick = () => {
        const ctx = ctxRef.current;
        const buffer = bufferRef.current;
        if (ctx && buffer && isPlayingRef.current) {
            const t = offsetRef.current + (ctx.currentTime - startedAtRef.current);
            setCurrentTime(Math.min(t, buffer.duration));
            rafRef.current = requestAnimationFrame(tick);
        }
    };

    const stopSource = () => {
        const source = sourceRef.current;
        if (source) {
            source.onended = null; // detach so manual stop doesn't fire the ended handler
            try { source.stop(); } catch { /* already stopped */ }
            source.disconnect();
            sourceRef.current = null;
        }
    };

    const play = () => {
        const ctx = getCtx();
        if (!bufferRef.current || isPlayingRef.current) return;
        if (ctx.state === "suspended") ctx.resume();

        const source = ctx.createBufferSource();
        source.buffer = bufferRef.current;
        source.connect(gainRef.current!);
        source.start(0, offsetRef.current);
        source.onended = () => {
            // fires only on natural end (manual stop detaches this)
            offsetRef.current = 0;
            isPlayingRef.current = false;
            sourceRef.current = null;
            stopRaf();
            setIsPlaying(false);
            setCurrentTime(0);
        };

        startedAtRef.current = ctx.currentTime;
        sourceRef.current = source;
        isPlayingRef.current = true;
        setIsPlaying(true);
        rafRef.current = requestAnimationFrame(tick);
    };

    const pause = () => {
        const ctx = ctxRef.current;
        if (!ctx || !isPlayingRef.current) return;
        offsetRef.current += ctx.currentTime - startedAtRef.current;
        stopSource();
        isPlayingRef.current = false;
        setIsPlaying(false);
        stopRaf();
        setCurrentTime(offsetRef.current);
    };

    const seek = (time: number) => {
        const buffer = bufferRef.current;
        if (!buffer) return;
        const wasPlaying = isPlayingRef.current;
        stopSource();
        isPlayingRef.current = false;
        stopRaf();
        offsetRef.current = Math.max(0, Math.min(time, buffer.duration));
        setCurrentTime(offsetRef.current);
        setIsPlaying(false);
        if (wasPlaying) play();
    };

    // decode whenever the file changes
    useEffect(() => {
        if (!file) return;
        let cancelled = false;

        stopSource();
        stopRaf();
        isPlayingRef.current = false;
        offsetRef.current = 0;
        setIsPlaying(false);
        setCurrentTime(0);
        setIsReady(false);

        const decode = async () => {
            const ctx = getCtx();
            const arrayBuffer = await file.arrayBuffer();
            const buffer = await ctx.decodeAudioData(arrayBuffer);
            if (cancelled) return;
            bufferRef.current = buffer;
            setDuration(buffer.duration);
            setIsReady(true);
        };
        decode().catch((err) => {
            if (!cancelled) {
                console.error("decode failed", err);
                alert("Could not decode this audio file.");
            }
        });

        return () => { cancelled = true; };
    }, [file]);

    // cleanup on unmount
    useEffect(() => () => { stopSource(); stopRaf(); }, []);

    return { isReady, isPlaying, currentTime, duration, play, pause, seek };
}