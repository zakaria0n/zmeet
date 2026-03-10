import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { API_URL } from '../config';

export default function Recordings() {
    const { user, getValidToken } = useAuth();
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    useEffect(() => {
        const fetchRecordings = async () => {
            try {
                const token = await getValidToken();
                if (!token) throw new Error('Session expired. Please log in again.');

                const res = await fetch(`${API_URL}/recordings/my-recordings`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                setRecordings(data);
            } catch (err) {
                toast.error(`Failed to load recordings: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchRecordings();
    }, [user.id, getValidToken]);

    const handleDeleteRecording = async (recordingId) => {
        try {
            setDeletingId(recordingId);
            const token = await getValidToken();
            if (!token) throw new Error('Session expired. Please log in again.');

            const res = await fetch(`${API_URL}/recordings/${recordingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete recording');

            setRecordings(prev => prev.filter(recording => recording.id !== recordingId));
            toast.success('Recording deleted');
        } catch (err) {
            toast.error(`Delete failed: ${err.message}`);
        } finally {
            setDeletingId(null);
        }
    };

    const handleDownloadRecording = async (recording) => {
        try {
            setDownloadingId(recording.id);
            const token = await getValidToken();
            if (!token) throw new Error('Session expired. Please log in again.');

            const response = await fetch(`${API_URL}/recordings/${recording.id}/download`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to download recording');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `${recording.room_code}-${recording.id}.webm`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(`Download failed: ${err.message}`);
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="dashboard-shell">
            <div className="dashboard-orb orb-one" style={{ top: '-10%', left: '-5%', width: '500px', height: '500px', opacity: 0.3 }}></div>
            <div className="dashboard-orb orb-two" style={{ bottom: '-10%', right: '-5%', width: '600px', height: '600px', opacity: 0.2 }}></div>

            <Navbar />

            <main className="main-content" style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
                <div className="glass-panel" style={{ padding: '40px', marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0 }}>My Recordings</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0 }}>Access all the meetings you recorded previously.</p>
                </div>

                {loading ? (
                    <div style={{ color: 'var(--text-muted)' }}>Loading recordings...</div>
                ) : recordings.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>You haven't recorded any meetings yet.</p>
                ) : (
                    <div className="recordings-grid">
                        {recordings.map(rec => (
                            <div key={rec.id} className="recording-card glass-panel">
                                <div className="recording-video-wrapper">
                                    <video controls src={rec.file_url} preload="metadata"></video>
                                </div>
                                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Room Code: {rec.room_code}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                                    Recorded on: {new Date(rec.created_at).toLocaleString()}
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                                    <button
                                        type="button"
                                        className="btn primary-btn"
                                        disabled={downloadingId === rec.id}
                                        onClick={() => handleDownloadRecording(rec)}
                                    >
                                        {downloadingId === rec.id ? 'Downloading...' : 'Download Video'}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn danger-btn"
                                        disabled={deletingId === rec.id}
                                        onClick={() => handleDeleteRecording(rec.id)}
                                    >
                                        {deletingId === rec.id ? 'Deleting...' : 'Delete Video'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
