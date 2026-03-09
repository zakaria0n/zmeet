import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import {
    Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff,
    CircleDot, Square, MessageSquare
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { API_URL, SOCKET_URL, supabase } from '../config';

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
    ]
};

export default function Meeting() {
    const { roomId } = useParams();
    const { user, token } = useAuth();
    const navigate = useNavigate();

    // Media States
    const [localStream, setLocalStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(true);

    // Chat States
    const [chatMessage, setChatMessage] = useState('');
    const [messages, setMessages] = useState([]);

    // Refs
    const socketRef = useRef(null);
    const peersRef = useRef({});
    const localVideoRef = useRef(null);
    const screenVideoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);

    // Audio mix output for recording
    const audioContextRef = useRef(null);

    const isTargetedToCurrentUser = (target) => !target || target === user.id;

    // Initialize and get access
    useEffect(() => {
        let mounted = true;
        const peers = peersRef.current;

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

                if (mounted) {
                    setLocalStream(stream);
                    localStreamRef.current = stream;
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = stream;
                    }
                    setupSocket(stream);
                } else {
                    stream.getTracks().forEach(track => track.stop());
                }
            } catch (err) {
                toast.error("Could not access camera/microphone");
                console.error(err);
            }
        };

        init();

        return () => {
            mounted = false;
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
            if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(track => track.stop());
            if (socketRef.current) socketRef.current.disconnect();

            Object.keys(peers).forEach(id => {
                peers[id].close();
            });
        };
        // eslint-disable-next-line
    }, [roomId, user.id]);

    useEffect(() => {
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = screenStream;
        }
    }, [screenStream]);

    const setupSocket = (currentStream) => {
        socketRef.current = io(SOCKET_URL);

        socketRef.current.emit('join-room', roomId, user.id, user.name);

        socketRef.current.on('user-connected', async ({ userId, userName }) => {
            toast(`${userName} joined the room`);
            const peer = createPeer(userId, socketRef.current.id, currentStream);
            peersRef.current[userId] = peer;
        });

        socketRef.current.on('webrtc-offer', async ({ offer, senderId, target }) => {
            if (!isTargetedToCurrentUser(target)) return;
            const peer = addPeer(offer, senderId, currentStream);
            peersRef.current[senderId] = peer;
        });

        socketRef.current.on('webrtc-answer', async ({ answer, senderId, target }) => {
            if (!isTargetedToCurrentUser(target)) return;
            const peer = peersRef.current[senderId];
            if (peer) {
                try {
                    await peer.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (e) {
                    console.error("Error setting remote description on answer", e);
                }
            }
        });

        socketRef.current.on('ice-candidate', async ({ candidate, senderId, target }) => {
            if (!isTargetedToCurrentUser(target)) return;
            const peer = peersRef.current[senderId];
            if (peer) {
                try {
                    await peer.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding received ice candidate", e);
                }
            }
        });

        socketRef.current.on('user-disconnected', ({ userId }) => {
            if (peersRef.current[userId]) {
                peersRef.current[userId].close();
                delete peersRef.current[userId];
                setRemoteStreams(prev => {
                    const newStreams = { ...prev };
                    delete newStreams[userId];
                    return newStreams;
                });
            }
        });

        socketRef.current.on('chat-message', (data) => {
            if (data.senderId !== user.id) {
                setMessages(prev => [...prev, data]);
            }
        });
    };

    const createPeer = (userId, callerId, stream) => {
        const peer = new RTCPeerConnection(configuration);

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', {
                    roomId,
                    candidate: event.candidate,
                    target: userId
                });
            }
        };

        peer.ontrack = (event) => {
            setRemoteStreams(prev => ({
                ...prev,
                [userId]: event.streams[0]
            }));
        };

        stream.getTracks().forEach(track => {
            peer.addTrack(track, stream);
        });

        peer.createOffer().then(offer => {
            peer.setLocalDescription(offer);
            socketRef.current.emit('webrtc-offer', {
                roomId,
                offer,
                target: userId
            });
        });

        return peer;
    };

    const addPeer = async (offer, callerId, stream) => {
        const peer = new RTCPeerConnection(configuration);

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', {
                    roomId,
                    candidate: event.candidate,
                    target: callerId
                });
            }
        };

        peer.ontrack = (event) => {
            setRemoteStreams(prev => ({
                ...prev,
                [callerId]: event.streams[0]
            }));
        };

        stream.getTracks().forEach(track => {
            peer.addTrack(track, stream);
        });

        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socketRef.current.emit('webrtc-answer', {
            roomId,
            answer,
            target: callerId
        });

        return peer;
    };

    // Controls Logic
    const toggleMic = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicOn(audioTrack.enabled);
            }
        }
    };

    const toggleCam = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCamOn(videoTrack.enabled);
            }
        }
    };

    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });

                // Replace video track in all peers
                const videoTrack = stream.getVideoTracks()[0];

                Object.keys(peersRef.current).forEach(userId => {
                    const peer = peersRef.current[userId];
                    const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) sender.replaceTrack(videoTrack);
                });

                setScreenStream(stream);
                screenStreamRef.current = stream;
                setIsScreenSharing(true);

                // Listen for browser "stop sharing"
                videoTrack.onended = () => {
                    stopScreenShare();
                };
            } catch (err) {
                if (err.name === "NotAllowedError" || err.message.includes("Permission denied")) {
                    toast.error("Screen sharing was cancelled.");
                } else {
                    console.error("Error sharing screen", err);
                    toast.error("An error occurred while sharing the screen.");
                }
            }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            setScreenStream(null);
            screenStreamRef.current = null;
        }

        // Revert to local camera
        const videoTrack = localStream.getVideoTracks()[0];
        Object.keys(peersRef.current).forEach(userId => {
            const peer = peersRef.current[userId];
            const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender && videoTrack) sender.replaceTrack(videoTrack);
        });

        setIsScreenSharing(false);
        setIsCamOn(videoTrack ? videoTrack.enabled : false);
    };

    // Recording Logic
    const startRecording = async () => {
        try {
            const captureStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" },
                audio: true
            });

            const localAudioTracks = localStream ? localStream.getAudioTracks() : [];

            if (localAudioTracks.length > 0) {
                audioContextRef.current = new AudioContext();
                const destination = audioContextRef.current.createMediaStreamDestination();

                if (captureStream.getAudioTracks().length > 0) {
                    const systemSource = audioContextRef.current.createMediaStreamSource(captureStream);
                    systemSource.connect(destination);
                }

                const micSource = audioContextRef.current.createMediaStreamSource(localStream);
                micSource.connect(destination);

                const mixedTracks = destination.stream.getAudioTracks();
                if (captureStream.getAudioTracks().length > 0) {
                    captureStream.removeTrack(captureStream.getAudioTracks()[0]);
                }
                captureStream.addTrack(mixedTracks[0]);
            }

            recordedChunksRef.current = [];
            const mediaRecorder = new MediaRecorder(captureStream, { mimeType: 'video/webm' });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) recordedChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                await handleUpload();
                captureStream.getTracks().forEach(t => t.stop());
            };

            captureStream.getVideoTracks()[0].onended = () => {
                if (isRecording) stopRecording();
            };

            mediaRecorder.start(1000);
            setIsRecording(true);
            toast.success("Recording started");

            setMessages(prev => [...prev, {
                senderId: 'system',
                senderName: 'System',
                text: 'Recording Started. It will process when stopped.',
                timestamp: new Date().toISOString()
            }]);

        } catch (err) {
            if (err.name === "NotAllowedError" || err.message.includes("Permission denied")) {
                toast.error("Screen sharing/recording was cancelled.");
            } else {
                console.error(err);
                toast.error("Failed to start recording.");
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleUpload = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const fileName = `${roomId}-${Date.now()}.webm`;

        toast("Uploading recording...", { icon: '⏳' });

        try {
            const { error } = await supabase.storage
                .from('recordings')
                .upload(fileName, blob, { contentType: 'video/webm' });

            if (error) throw error;

            const { data: publicData } = supabase.storage
                .from('recordings')
                .getPublicUrl(fileName);

            const res = await fetch(`${API_URL}/recordings/save-metadata`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    room_code: roomId,
                    file_url: publicData.publicUrl
                })
            });

            if (!res.ok) throw new Error("Metadata save failed");
            toast.success("Recording uploaded and saved!");

            setMessages(prev => [...prev, {
                senderId: 'system',
                senderName: 'System',
                text: '✅ Recording uploaded! View it in your Dashboard.',
                timestamp: new Date().toISOString()
            }]);

        } catch (err) {
            console.error(err);
            toast.error(`Recording upload failed: ${err.message}`);

            // Fallback local download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    // Chat Logic
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!chatMessage.trim()) return;

        socketRef.current.emit('chat-message', {
            roomId,
            senderId: user.id,
            senderName: user.name,
            text: chatMessage.trim()
        });

        setMessages(prev => [...prev, {
            senderId: user.id,
            senderName: user.name,
            text: chatMessage.trim(),
            timestamp: new Date().toISOString(),
            isSelf: true
        }]);

        setChatMessage('');
    };

    const handleLeave = () => {
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
        if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(track => track.stop());
        if (socketRef.current) socketRef.current.disconnect();
        navigate('/');
    };

    return (
        <div className="meeting-wrapper">
            <header className="meeting-header">
                <div className="logo" style={{ fontSize: '1.2rem' }}>ZMeet <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'normal', marginLeft: '10px' }}>Room: {roomId}</span></div>
                <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="btn"
                    style={{ background: 'transparent', color: isChatOpen ? 'var(--accent)' : 'white' }}
                >
                    <MessageSquare size={20} />
                </button>
            </header>

            <div className="meeting-body">

                {/* Videos Area */}
                <div className="video-area">
                    <div className="video-grid">
                        {/* Local Camera */}
                        <div className="video-wrapper">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{ transform: 'scaleX(-1)' }}
                            />
                            <div className="video-name">You (Camera)</div>
                        </div>

                        {isScreenSharing && (
                            <div className="video-wrapper screen-share-tile">
                                <video
                                    ref={screenVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                />
                                <div className="video-name">Your Screen</div>
                            </div>
                        )}

                        {/* Remote Videos */}
                        {Object.entries(remoteStreams).map(([peerId, stream]) => (
                            <div key={peerId} className="video-wrapper">
                                <video
                                    autoPlay
                                    playsInline
                                    ref={el => { if (el) el.srcObject = stream }}
                                />
                                <div className="video-name">Participant</div>
                            </div>
                        ))}
                    </div>

                    {/* Controls Bar */}
                    <div className="controls-bar glass-panel" style={{ padding: '0 40px', height: '80px', borderRadius: '20px 20px 0 0', borderBottom: 'none' }}>
                        <button
                            onClick={toggleMic}
                            className={`icon-btn ${!isMicOn ? 'muted' : 'active'}`}
                            title={isMicOn ? "Turn off mic" : "Turn on mic"}
                        >
                            {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                        </button>

                        <button
                            onClick={toggleCam}
                            className={`icon-btn ${!isCamOn ? 'muted' : 'active'}`}
                            title={isCamOn ? "Turn off camera" : "Turn on camera"}
                        >
                            {isCamOn ? <Video size={24} /> : <VideoOff size={24} />}
                        </button>

                        <button
                            onClick={toggleScreenShare}
                            className={`icon-btn ${isScreenSharing ? 'active' : ''}`}
                        >
                            <MonitorUp size={24} />
                        </button>

                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`icon-btn ${isRecording ? 'recording' : ''}`}
                            title={isRecording ? 'Stop Recording' : 'Start Recording'}
                        >
                            {isRecording ? <Square size={20} fill="currentColor" /> : <CircleDot size={24} />}
                        </button>

                        <button
                            onClick={handleLeave}
                            className="icon-btn leave"
                        >
                            <PhoneOff size={24} />
                        </button>
                    </div>
                </div>

                {/* Chat Panel */}
                {isChatOpen && (
                    <div className="chat-panel">
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>Chat</div>

                        <div className="chat-messages">
                            {messages.map((msg, idx) => (
                                <div key={idx} className="chat-msg">
                                    <strong>{msg.isSelf ? 'You' : msg.senderName}</strong>
                                    {msg.text}
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSendMessage} className="chat-input-area" style={{ background: 'var(--bg-secondary)' }}>
                            <input
                                type="text"
                                placeholder="Send a message..."
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                            />
                            <button type="submit" className="btn primary-btn" style={{ width: 'auto' }}>Send</button>
                        </form>
                    </div>
                )}

            </div>
        </div>
    );
}
