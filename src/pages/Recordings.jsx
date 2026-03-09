import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

export default function Recordings() {
    const { user, getValidToken } = useAuth();
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

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

    return (
        <>
            <header className="top-nav">
                <Link to="/" className="logo" style={{ textDecoration: 'none' }}>ZMeet</Link>
                <div className="user-menu" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span>{user.name || user.email}</span>
                    <Link to="/" className="btn" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '6px 12px', fontSize: '0.85rem', color: 'white' }}>
                        Back to Dashboard
                    </Link>
                </div>
            </header>

            <main className="main-content" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ marginBottom: '10px' }}>My Recordings</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Access all the meetings you recorded previously.</p>

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
                                <a href={rec.file_url} download target="_blank" rel="noreferrer" className="btn primary-btn" style={{ marginTop: '10px' }}>
                                    Download Video
                                </a>
                                <button
                                    type="button"
                                    className="btn danger-btn"
                                    style={{ marginTop: '8px' }}
                                    disabled={deletingId === rec.id}
                                    onClick={() => handleDeleteRecording(rec.id)}
                                >
                                    {deletingId === rec.id ? 'Deleting...' : 'Delete Video'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
