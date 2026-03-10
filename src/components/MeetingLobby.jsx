import { Link } from 'react-router-dom';
import MediaStreamVideo from './MediaStreamVideo';

export default function MeetingLobby({
    roomId,
    localStream,
    isPreparingMedia,
    mediaError,
    isMicOn,
    isCamOn,
    onToggleMic,
    onToggleCam,
    onJoinMeeting,
    onBack
}) {
    return (
        <div className="meeting-wrapper">
            <header className="meeting-header">
                <Link to="/" className="logo" style={{ fontSize: '1.2rem', textDecoration: 'none' }}>
                    ZMeet
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'normal', marginLeft: '10px' }}>
                        Room: {roomId}
                    </span>
                </Link>
            </header>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                <div
                    className="glass-panel"
                    style={{ width: 'min(960px, 100%)', padding: '32px', display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(260px, 0.8fr)', gap: '24px' }}
                >
                    <div className="video-wrapper" style={{ minHeight: '420px' }}>
                        {localStream ? (
                            <MediaStreamVideo stream={localStream} muted style={{ transform: 'scaleX(-1)' }} />
                        ) : (
                            <div style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>
                                {isPreparingMedia ? 'Preparing camera preview...' : 'No camera preview available'}
                            </div>
                        )}
                        <div className="video-name">Preview</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h1 style={{ fontSize: '2rem', lineHeight: 1.1 }}>Ready to join?</h1>
                            <p style={{ color: 'var(--text-muted)' }}>
                                Choose your microphone and camera settings before entering the meeting.
                            </p>
                            {mediaError && (
                                <p style={{ color: 'var(--danger)', fontSize: '0.95rem' }}>{mediaError}</p>
                            )}
                        </div>

                        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <button
                                type="button"
                                onClick={onToggleMic}
                                className={`btn ${isMicOn ? 'primary-btn' : 'danger-btn'}`}
                                style={{ width: '100%' }}
                            >
                                {isMicOn ? 'Microphone On' : 'Microphone Off'}
                            </button>
                            <button
                                type="button"
                                onClick={onToggleCam}
                                className={`btn ${isCamOn ? 'primary-btn' : 'danger-btn'}`}
                                style={{ width: '100%' }}
                            >
                                {isCamOn ? 'Camera On' : 'Camera Off'}
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                type="button"
                                className="btn primary-btn"
                                onClick={onJoinMeeting}
                                disabled={isPreparingMedia}
                                style={{ width: '100%' }}
                            >
                                {isPreparingMedia ? 'Preparing...' : 'Join Meeting'}
                            </button>
                            <button
                                type="button"
                                className="btn"
                                onClick={onBack}
                                style={{ width: '100%', background: 'var(--bg-secondary)', color: 'white', border: '1px solid var(--border)' }}
                            >
                                Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
