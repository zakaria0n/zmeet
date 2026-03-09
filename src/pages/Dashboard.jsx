import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

export default function Dashboard() {
    const { user, logout, getValidToken } = useAuth();
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleCreateRoom = async () => {
        setLoading(true);
        try {
            const token = await getValidToken();
            if (!token) throw new Error('Session expired. Please log in again.');

            const res = await fetch(`${API_URL}/rooms/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ created_by: user.id })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('Room created!');
            navigate(`/meeting/${data.room_code}`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        if (!roomCode.trim()) {
            toast.error('Please enter a room code');
            return;
        }

        setLoading(true);
        try {
            const token = await getValidToken();
            if (!token) throw new Error('Session expired. Please log in again.');

            const res = await fetch(`${API_URL}/rooms/${roomCode.trim()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Room not found');
            }

            toast.success('Joining room...');
            navigate(`/meeting/${roomCode.trim()}`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <header className="top-nav">
                <div className="logo">ZMeet</div>
                <div className="user-menu" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span>{user.name || user.email}</span>
                    <Link to="/recordings" className="btn" style={{ backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border)', padding: '6px 12px', color: 'white' }}>
                        My Recordings
                    </Link>
                    <button onClick={logout} className="btn danger-btn" style={{ padding: '6px 12px' }}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="main-content" style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', maxWidth: '1200px', margin: '0 auto', alignItems: 'flex-start' }}>

                {/* Create Room Section */}
                <section className="glass-panel" style={{ flex: '1 1 300px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Start a Meeting</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Create a new secure meeting room and share the code with others.</p>
                    </div>
                    <button
                        onClick={handleCreateRoom}
                        disabled={loading}
                        className="btn primary-btn"
                        style={{ padding: '15px' }}
                    >
                        {loading ? 'Creating...' : 'Create Meeting'}
                    </button>
                </section>

                {/* Join Room Section */}
                <section className="glass-panel" style={{ flex: '1 1 300px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Join a Meeting</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Enter a 6-character room code to join an existing meeting.</p>
                    </div>
                    <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input
                            type="text"
                            placeholder="Enter Room Code (e.g. ABCDEF)"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toLowerCase())}
                            maxLength={6}
                            style={{ padding: '15px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white', fontSize: '1.1rem', textAlign: 'center', letterSpacing: '2px' }}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn"
                            style={{ backgroundColor: 'white', color: 'black', padding: '15px' }}
                        >
                            Join
                        </button>
                    </form>
                </section>

            </main>
        </>
    );
}
