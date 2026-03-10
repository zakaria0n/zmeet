import { Link } from 'react-router-dom';
import { Video, ShieldCheck, Zap, Globe, Sparkles, MonitorUp, Waves } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import logo from '../assets/logo.png';

export default function Home() {
    const { user } = useAuth();

    return (
        <div className="dashboard-shell">
            {/* Dynamic Background Elements */}
            <div className="dashboard-orb orb-one" style={{ top: '-20%', left: '-10%', width: '600px', height: '600px', opacity: 0.5 }}></div>
            <div className="dashboard-orb orb-two" style={{ bottom: '-20%', right: '-10%', width: '800px', height: '800px', opacity: 0.4 }}></div>
            
            <div className="bg-grid-pattern"></div>

            <Navbar />

            <main className="main-content" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '80px', paddingTop: '60px' }}>
                
                {/* Hero Section */}
                <section className="animate-in" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                    gap: '60px', 
                    alignItems: 'center', 
                    padding: '20px',
                    position: 'relative',
                    zIndex: 10
                }}>
                    <div className="dashboard-hero-copy">
                        <div className="dashboard-badge">
                            <Sparkles size={16} />
                            Real-time collaboration workspace
                        </div>
                        <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)', lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.02em', color: '#fff' }}>
                            Launch meetings fast, bring people in, and keep every session within reach.
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', maxWidth: '50ch', lineHeight: '1.7' }}>
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

                        <div className="hero-actions" style={{ display: 'flex', gap: '16px', marginTop: '30px', flexWrap: 'wrap' }}>
                            {user ? (
                                <>
                                    <Link to="/dashboard" className="btn primary-btn btn-lg" style={{ width: 'auto', padding: '16px 36px', fontSize: '1.1rem', borderRadius: '16px' }}>
                                        Go to Dashboard
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/auth?mode=signup" className="btn primary-btn btn-lg" style={{ width: 'auto', padding: '16px 36px', fontSize: '1.1rem', borderRadius: '16px' }}>
                                        Start for free
                                    </Link>
                                    <Link to="/auth?mode=login" className="btn dashboard-secondary-btn btn-lg" style={{ width: 'auto', padding: '16px 36px', fontSize: '1.1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        Join a meeting
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="dashboard-hero-visual" style={{ display: 'flex', justifyContent: 'center' }}>
                        <div className="dashboard-visual-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)' }}>
                            <img src={logo} alt="ZMeet mark" className="dashboard-hero-logo" style={{ filter: 'drop-shadow(0 20px 40px rgba(99, 102, 241, 0.6))', transform: 'scale(1.1)' }} />
                            <div className="dashboard-visual-copy">
                                <strong>Ready for your next room</strong>
                                <span>Start a secure session and invite the team in seconds.</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="features-section" style={{ padding: '80px 0', position: 'relative', zIndex: 10 }}>
                    <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '16px' }}>Built for performance & privacy</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>Everything you need for productive meetings, nothing you don't.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                        {[
                            { icon: <Zap size={24} color="#f59e0b" />, title: "Lightning Fast", desc: "Join meetings instantly without any mandatory software downloads or plugin installations." },
                            { icon: <ShieldCheck size={24} color="#10b981" />, title: "Secure Rooms", desc: "Your meetings are protected with unique, randomized codes and end-to-end encryption protocols." },
                            { icon: <Globe size={24} color="#3b82f6" />, title: "Global Network", desc: "Crystal clear audio and 1080p video quality optimized for low bandwidth connections worldwide." },
                            { icon: <Video size={24} color="#6366f1" />, title: "Crystal Clear", desc: "High definition video with intelligent noise cancellation to keep the focus on your conversation." }
                        ].map((feature, i) => (
                            <div key={i} className="glass-panel feature-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ 
                                    width: '56px', height: '56px', borderRadius: '14px', 
                                    background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {feature.icon}
                                </div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: '600' }}>{feature.title}</h3>
                                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
                
                {/* Footer */}
                <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '40px', paddingBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={logo} alt="Logo" style={{ width: '24px', opacity: 0.5 }} />
                        <span style={{ fontWeight: '600', color: '#fff' }}>ZMeet</span>
                        <span>© 2026</span>
                    </div>
                    <p style={{ fontSize: '0.9rem' }}>Built with privacy and performance in mind.</p>
                </footer>
            </main>

            <style>{`
                .bg-grid-pattern {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: 
                        linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
                    background-size: 50px 50px;
                    mask-image: radial-gradient(circle at center, black, transparent 80%);
                    -webkit-mask-image: radial-gradient(circle at center, black, transparent 80%);
                    z-index: 1;
                    pointer-events: none;
                }
                
                @keyframes shine {
                    to {
                        background-position: 200% center;
                    }
                }
                
                .mockup-window:hover {
                    transform: rotateX(0deg) translateY(-10px) !important;
                }
                
                .feature-card:hover {
                    border-color: rgba(99, 102, 241, 0.4);
                }
            `}</style>
        </div>
    );
}
