import { useEffect, useRef } from 'react';

export default function MediaStreamAudio({ stream }) {
    const audioRef = useRef(null);

    useEffect(() => {
        const audioElement = audioRef.current;

        if (!audioElement) {
            return undefined;
        }

        audioElement.srcObject = stream || null;

        if (stream) {
            audioElement.play().catch(() => {
                // Autoplay can be blocked briefly, but the stream remains attached.
            });
        }

        return () => {
            if (audioElement.srcObject === stream) {
                audioElement.srcObject = null;
            }
        };
    }, [stream]);

    return <audio ref={audioRef} autoPlay playsInline />;
}
