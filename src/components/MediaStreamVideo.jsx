import { useEffect, useRef } from 'react';

export default function MediaStreamVideo({ stream, muted = false, className = '', style, ...props }) {
    const videoRef = useRef(null);

    useEffect(() => {
        const videoElement = videoRef.current;

        if (!videoElement) {
            return undefined;
        }

        videoElement.srcObject = stream || null;

        if (stream) {
            videoElement.play().catch(() => {
                // Browsers can reject autoplay during mount transitions. The stream is still attached.
            });
        }

        return () => {
            if (videoElement.srcObject === stream) {
                videoElement.srcObject = null;
            }
        };
    }, [stream]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className={className}
            style={style}
            {...props}
        />
    );
}
