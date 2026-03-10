import { useEffect, useRef } from 'react';

export default function MediaStreamVideo({ stream, muted = false, className = '', style, ...props }) {
    const videoRef = useRef(null);

    useEffect(() => {
        const videoElement = videoRef.current;

        if (!videoElement) {
            return undefined;
        }

        videoElement.srcObject = stream || null;

        const tryPlay = () => {
            videoElement.play().catch(() => {
                // Remote media can be blocked by autoplay policy until the user interacts again.
            });
        };

        if (stream) {
            if (videoElement.readyState >= 1) {
                tryPlay();
            } else {
                videoElement.onloadedmetadata = tryPlay;
            }
        }

        return () => {
            videoElement.onloadedmetadata = null;
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
