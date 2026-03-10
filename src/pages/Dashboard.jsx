import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DoorOpen, MonitorUp, ShieldCheck, Sparkles, Video, Waves } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import logo from '../assets/logo.png';

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
        <div className="dashboard-shell">
            <div className="dashboard-orb orb-one" />
            <div className="dashboard-orb orb-two" />

            <header className="top-nav dashboard-nav">
                <div className="dashboard-brand">
                    <img src={logo} alt="ZMeet logo" className="dashboard-logo" />
                    <div>
                        <div className="dashboard-brand-title">ZMeet</div>
                        <div className="dashboard-brand-subtitle">Meet. Share. Record.</div>
                    </div>
                </div>

                <div className="user-menu dashboard-user-menu">
                    <div className="dashboard-user-chip">
                        <span className="dashboard-user-label">Signed in</span>
                        <strong>{user.name || user.email}</strong>
                    </div>
                    <Link to="/recordings" className="btn dashboard-secondary-btn">
                        My Recordings
                    </Link>
                    <button onClick={logout} className="btn danger-btn" style={{ padding: '10px 14px' }}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="main-content dashboard-main">
                <section className="dashboard-hero glass-panel">
                    <div className="dashboard-hero-copy">
                        <div className="dashboard-badge">
                            <Sparkles size={16} />
                            Real-time collaboration workspace
                        </div>
                        <h1>Launch meetings fast, bring people in, and keep every session within reach.</h1>
                        <p>
                            ZMeet is your lightweight room hub for live calls, screen sharing, chat, and recordings,
                            all from one clean dashboard.
                        </p>

                        <div className="dashboard-stat-row">
                            <div className="dashboard-stat-card">
                                <ShieldCheck size={18} />
                                <span>Protected room codes</span>
                            </div>
                            <div className="dashboard-stat-card">
                                <MonitorUp size={18} />
                                <span>Screen sharing ready</span>
                            </div>
                            <div className="dashboard-stat-card">
                                <Waves size={18} />
                                <span>Live chat and reactions</span>
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-hero-visual">
                        <div className="dashboard-visual-card glass-panel">
                            <img src={logo} alt="ZMeet mark" className="dashboard-hero-logo" />
                            <div className="dashboard-visual-copy">
                                <strong>Ready for your next room</strong>
                                <span>Start a secure session and invite the team in seconds.</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="dashboard-actions-grid">
                    <section className="glass-panel dashboard-action-card primary">
                        <div className="dashboard-action-icon">
                            <Video size={22} />
                        </div>
                        <div>
                            <h2>Start a Meeting</h2>
                            <p>Create a fresh room code and jump straight into your live workspace.</p>
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

                    <section className="glass-panel dashboard-action-card">
                        <div className="dashboard-action-icon">
                            <DoorOpen size={22} />
                        </div>
                        <div>
                            <h2>Join a Meeting</h2>
                            <p>Enter a room code to reconnect with your team or jump into an active call.</p>
                        </div>
                        <form onSubmit={handleJoinRoom} className="dashboard-join-form">
                            <input
                                type="text"
                                placeholder="Enter room code"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toLowerCase())}
                                maxLength={6}
                                className="dashboard-room-input"
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn dashboard-join-btn"
                            >
                                Join Room
                            </button>
                        </form>
                    </section>
                </section>

                <section className="dashboard-feature-grid">
                    <article className="glass-panel dashboard-feature-card">
                        <span className="dashboard-feature-kicker">Inside every session</span>
                        <h3>Video, voice, screen and chat in one place</h3>
                        <p>Keep the call focused while sharing screens, reacting with emoji, and following the room chat.</p>
                    </article>

                    <article className="glass-panel dashboard-feature-card">
                        <span className="dashboard-feature-kicker">After the meeting</span>
                        <h3>Recordings stay one click away</h3>
                        <p>Open your saved sessions from the recordings space whenever you need to review or download them.</p>
                    </article>

                    <article className="glass-panel dashboard-feature-card">
                        <span className="dashboard-feature-kicker">Quick tip</span>
                        <h3>Best results for room codes</h3>
                        <p>Ask everyone to enter the exact 6-character code and wait in the dashboard until the host is ready.</p>
                    </article>
                </section>
            </main>
        </div>
    );
}
