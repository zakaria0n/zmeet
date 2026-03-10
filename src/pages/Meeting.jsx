import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import {
    CircleDot,
    MessageSquare,
    Mic,
    MicOff,
    MonitorUp,
    PhoneOff,
    Square,
    Video,
    VideoOff
} from 'lucide-react';

import MeetingLobby from '../components/MeetingLobby';
import MediaStreamAudio from '../components/MediaStreamAudio';
import MediaStreamVideo from '../components/MediaStreamVideo';
import { useAuth } from '../context/AuthContext';
import { API_URL, ICE_SERVERS, SOCKET_URL, supabase } from '../config';

const configuration = {
    iceServers: ICE_SERVERS
};

export default function Meeting() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user, getValidToken } = useAuth();

    const [localStream, setLocalStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null);
    const [remoteParticipants, setRemoteParticipants] = useState({});
    const [messages, setMessages] = useState([]);
    const [reactions, setReactions] = useState([]);
    const [chatMessage, setChatMessage] = useState('');
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [hasJoinedMeeting, setHasJoinedMeeting] = useState(false);
    const [isPreparingMedia, setIsPreparingMedia] = useState(true);
    const [mediaError, setMediaError] = useState('');

    const socketRef = useRef(null);
    const peersRef = useRef({});
    const remoteStreamSlotsRef = useRef({});
    const remoteSlotStreamsRef = useRef({});
    const pendingIceByUserRef = useRef({});
    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const reactionTimeoutsRef = useRef([]);
    const remoteParticipantsRef = useRef({});

    const isTargetedToCurrentUser = (target) => !target || target === user.id;
    const isPolitePeer = (remoteUserId) => user.id.localeCompare(remoteUserId) > 0;

    const syncTrackState = (track, enabled) => {
        if (track) {
            track.enabled = enabled;
        }
    };

    const setParticipantStream = (userId, slot, stream) => {
        setRemoteParticipants(prev => ({
            ...prev,
            [userId]: {
                name: prev[userId]?.name || 'Participant',
                audioStream: prev[userId]?.audioStream || null,
                cameraStream: prev[userId]?.cameraStream || null,
                screenStream: prev[userId]?.screenStream || null,
                [slot]: stream
            }
        }));
    };

    const registerParticipant = (userId, userName = 'Participant') => {
        setRemoteParticipants(prev => ({
            ...prev,
            [userId]: {
                name: prev[userId]?.name || userName,
                audioStream: prev[userId]?.audioStream || null,
                cameraStream: prev[userId]?.cameraStream || null,
                screenStream: prev[userId]?.screenStream || null
            }
        }));
    };

    useEffect(() => {
        remoteParticipantsRef.current = remoteParticipants;
    }, [remoteParticipants]);

    const clearParticipantStream = (userId, slot) => {
        setRemoteParticipants(prev => {
            const participant = prev[userId];

            if (!participant) {
                return prev;
            }

            const nextParticipant = { ...participant, [slot]: null };

            if (!nextParticipant.audioStream && !nextParticipant.cameraStream && !nextParticipant.screenStream) {
                const next = { ...prev };
                delete next[userId];
                return next;
            }

            return {
                ...prev,
                [userId]: nextParticipant
            };
        });
    };

    const removeParticipant = (userId) => {
        delete remoteStreamSlotsRef.current[userId];
        delete remoteSlotStreamsRef.current[userId];
        delete pendingIceByUserRef.current[userId];

        setRemoteParticipants(prev => {
            const next = { ...prev };
            delete next[userId];
            return next;
        });
    };

    const attachTrackEndedHandler = (userId, slot, track, streamId) => {
        track.onended = () => {
            const slots = remoteStreamSlotsRef.current[userId];
            const slotStreams = remoteSlotStreamsRef.current[userId];

            if (slots?.[slot] === streamId) {
                delete slots[slot];
            }

            if (slotStreams?.[slot]?.id === streamId) {
                delete slotStreams[slot];
            }

            clearParticipantStream(userId, slot);
        };
    };

    const getRemoteSlotStream = (userId, slot, track, incomingStream) => {
        const streamHasMatchingTrack = incomingStream?.getTracks().some(currentTrack => currentTrack.id === track.id);
        const usableIncomingStream = streamHasMatchingTrack ? incomingStream : null;

        if (!remoteSlotStreamsRef.current[userId]) {
            remoteSlotStreamsRef.current[userId] = {};
        }

        const existingStream = remoteSlotStreamsRef.current[userId][slot];
        if (existingStream) {
            const hasTrack = existingStream.getTracks().some(currentTrack => currentTrack.id === track.id);

            if (!hasTrack) {
                existingStream.addTrack(track);
            }

            return existingStream;
        }

        const nextStream = usableIncomingStream || new MediaStream([track]);
        remoteSlotStreamsRef.current[userId][slot] = nextStream;
        return nextStream;
    };

    const getSlotFromTransceiver = (peerRecord, transceiver, trackKind) => {
        if (trackKind === 'audio') {
            return 'audioStream';
        }

        if (transceiver === peerRecord.transceivers.camera) {
            return 'cameraStream';
        }

        if (transceiver === peerRecord.transceivers.screen) {
            return 'screenStream';
        }

        return null;
    };

    const registerRemoteTrack = (userId, peerRecord, track, stream, transceiver) => {
        const slot = getSlotFromTransceiver(peerRecord, transceiver, track.kind);

        if (!slot) {
            return;
        }

        const resolvedStream = getRemoteSlotStream(userId, slot, track, stream);
        const slots = remoteStreamSlotsRef.current[userId] || {};
        slots[slot] = resolvedStream.id;
        remoteStreamSlotsRef.current[userId] = slots;
        setParticipantStream(userId, slot, resolvedStream);
        attachTrackEndedHandler(userId, slot, track, resolvedStream.id);
    };

    const applyPreferredTrackState = (stream) => {
        if (!stream) {
            return;
        }

        syncTrackState(stream.getAudioTracks()[0], isMicOn);
        syncTrackState(stream.getVideoTracks()[0], isCamOn);
    };

    const syncLocalTracksToPeer = async (peerRecord) => {
        const localAudioTrack = localStreamRef.current?.getAudioTracks?.()[0] || null;
        const localCameraTrack = localStreamRef.current?.getVideoTracks?.()[0] || null;
        const localScreenTrack = screenStreamRef.current?.getVideoTracks?.()[0] || null;

        await peerRecord.transceivers.audio.sender.replaceTrack(localAudioTrack);
        await peerRecord.transceivers.camera.sender.replaceTrack(localCameraTrack);
        await peerRecord.transceivers.screen.sender.replaceTrack(localScreenTrack);
    };

    const ensurePeerConnection = (remoteUserId) => {
        if (peersRef.current[remoteUserId]) {
            return peersRef.current[remoteUserId];
        }

        const connection = new RTCPeerConnection(configuration);
        const transceivers = {
            audio: connection.addTransceiver('audio', { direction: 'sendrecv' }),
            camera: connection.addTransceiver('video', { direction: 'sendrecv' }),
            screen: connection.addTransceiver('video', { direction: 'sendrecv' })
        };
        const peerRecord = {
            connection,
            transceivers,
            makingOffer: false,
            pendingCandidates: pendingIceByUserRef.current[remoteUserId] || [],
            ignoreOffer: false,
            isSettingRemoteAnswerPending: false,
            needsNegotiation: false,
            polite: isPolitePeer(remoteUserId)
        };

        delete pendingIceByUserRef.current[remoteUserId];

        connection.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current?.emit('ice-candidate', {
                    roomId,
                    candidate: event.candidate,
                    target: remoteUserId
                });
            }
        };

        connection.ontrack = (event) => {
            registerRemoteTrack(remoteUserId, peerRecord, event.track, event.streams[0], event.transceiver);
        };

        connection.onconnectionstatechange = () => {
            if (['failed', 'closed'].includes(connection.connectionState)) {
                removeParticipant(remoteUserId);
            }
        };

        connection.onsignalingstatechange = () => {
            if (connection.signalingState === 'stable' && peerRecord.needsNegotiation) {
                peerRecord.needsNegotiation = false;
                requestNegotiation(remoteUserId).catch(error => {
                    console.error('Error running deferred negotiation', error);
                });
            }
        };

        connection.onnegotiationneeded = () => {
            requestNegotiation(remoteUserId).catch(error => {
                console.error('Error running negotiationneeded handler', error);
            });
        };

        peersRef.current[remoteUserId] = peerRecord;
        syncLocalTracksToPeer(peerRecord).catch(error => {
            console.error('Error syncing local tracks to peer', error);
        });
        return peerRecord;
    };

    const negotiateWithPeer = async (remoteUserId) => {
        const peerRecord = ensurePeerConnection(remoteUserId);
        const { connection } = peerRecord;

        if (peerRecord.makingOffer) {
            return;
        }

        try {
            peerRecord.makingOffer = true;
            if (connection.signalingState !== 'stable') {
                return;
            }

            const offer = await connection.createOffer();
            await connection.setLocalDescription(offer);

            socketRef.current?.emit('webrtc-offer', {
                roomId,
                offer,
                target: remoteUserId
            });
        } catch (error) {
            console.error('Error creating offer', error);
        } finally {
            peerRecord.makingOffer = false;
        }
    };

    const requestNegotiation = async (remoteUserId) => {
        const peerRecord = ensurePeerConnection(remoteUserId);

        if (peerRecord.makingOffer || peerRecord.connection.signalingState !== 'stable') {
            peerRecord.needsNegotiation = true;
            return;
        }

        await negotiateWithPeer(remoteUserId);
    };

    const flushPendingCandidates = async (peerRecord) => {
        if (!peerRecord.pendingCandidates.length) {
            return;
        }

        const queuedCandidates = [...peerRecord.pendingCandidates];
        peerRecord.pendingCandidates = [];

        for (const candidate of queuedCandidates) {
            try {
                await peerRecord.connection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('Error applying queued ICE candidate', error);
            }
        }
    };

    const pushReaction = (reaction) => {
        const id = `${reaction.senderId}-${reaction.timestamp}-${Math.random().toString(36).slice(2, 8)}`;
        const nextReaction = { ...reaction, id };

        setReactions(prev => [...prev, nextReaction]);

        const timeoutId = setTimeout(() => {
            setReactions(prev => prev.filter(currentReaction => currentReaction.id !== id));
        }, 2400);

        reactionTimeoutsRef.current.push(timeoutId);
    };

    const addTrackToPeers = async (slot, track) => {
        for (const peerId of Object.keys(peersRef.current)) {
            const peerRecord = ensurePeerConnection(peerId);
            await peerRecord.transceivers[slot].sender.replaceTrack(track);
            await requestNegotiation(peerId);
        }
    };

    const removeTrackFromPeers = async (slot) => {
        for (const peerId of Object.keys(peersRef.current)) {
            const peerRecord = peersRef.current[peerId];
            await peerRecord.transceivers[slot].sender.replaceTrack(null);
            await requestNegotiation(peerId);
        }
    };

    const initializeLocalMedia = async ({ micEnabled = isMicOn, camEnabled = isCamOn } = {}) => {
        setIsPreparingMedia(true);
        setMediaError('');

        if (!micEnabled && !camEnabled) {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
                setLocalStream(null);
            }

            setIsPreparingMedia(false);
            return null;
        }

        try {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: micEnabled,
                video: camEnabled
            });

            syncTrackState(stream.getAudioTracks()[0], micEnabled);
            syncTrackState(stream.getVideoTracks()[0], camEnabled);
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.error(error);
            setMediaError('Camera or microphone access was denied.');
            return null;
        } finally {
            setIsPreparingMedia(false);
        }
    };

    const ensureLocalTrack = async (kind) => {
        const existingTrack = localStreamRef.current?.getTracks().find(track => track.kind === kind);

        if (existingTrack) {
            syncTrackState(existingTrack, true);
            return existingTrack;
        }

        try {
            const extraStream = await navigator.mediaDevices.getUserMedia({
                audio: kind === 'audio',
                video: kind === 'video'
            });

            const nextStream = localStreamRef.current || new MediaStream();
            extraStream.getTracks().forEach(track => nextStream.addTrack(track));

            localStreamRef.current = nextStream;
            setLocalStream(nextStream);

            const addedTrack = nextStream.getTracks().find(track => track.kind === kind);
            if (addedTrack) {
                await addTrackToPeers(kind === 'audio' ? 'audio' : 'camera', addedTrack);
            }

            return addedTrack || null;
        } catch (error) {
            console.error(`Failed to get ${kind} track`, error);
            toast.error(`Could not enable ${kind === 'video' ? 'camera' : 'microphone'}.`);
            return null;
        }
    };

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            const stream = await initializeLocalMedia();

            if (!mounted && stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };

        init();

        return () => {
            mounted = false;

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }

            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
            }

            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
            }

            reactionTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
            reactionTimeoutsRef.current = [];

            socketRef.current?.disconnect();

            Object.values(peersRef.current).forEach(peerRecord => {
                peerRecord.connection.close();
            });

            peersRef.current = {};
            remoteStreamSlotsRef.current = {};
            pendingIceByUserRef.current = {};
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, user.id]);

    const setupSocket = () => {
        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on('room-error', ({ message }) => {
            toast.error(message || 'Room not found');
            socket.disconnect();
            navigate('/');
        });

        socket.on('chat-history', (history) => {
            setMessages(history || []);
        });

        socket.on('existing-users', async (existingUsers) => {
            for (const participant of existingUsers || []) {
                registerParticipant(participant.userId, participant.userName);
                ensurePeerConnection(participant.userId);
            }
        });

        socket.on('user-connected', async ({ userId: remoteUserId, userName }) => {
            toast(`${userName} joined the room`);
            registerParticipant(remoteUserId, userName);
            await requestNegotiation(remoteUserId);
        });

        socket.on('webrtc-offer', async ({ offer, senderId, target }) => {
            if (!isTargetedToCurrentUser(target)) {
                return;
            }

            const peerRecord = ensurePeerConnection(senderId);
            const { connection } = peerRecord;
            const readyForOffer = !peerRecord.makingOffer
                && (connection.signalingState === 'stable' || peerRecord.isSettingRemoteAnswerPending);
            const offerCollision = !readyForOffer;
            peerRecord.ignoreOffer = !peerRecord.polite && offerCollision;

            if (peerRecord.ignoreOffer) {
                return;
            }

            try {
                peerRecord.isSettingRemoteAnswerPending = offer.type === 'answer';

                if (offerCollision && connection.signalingState === 'have-local-offer') {
                    await connection.setLocalDescription({ type: 'rollback' });
                }

                await connection.setRemoteDescription(new RTCSessionDescription(offer));
                peerRecord.isSettingRemoteAnswerPending = false;
                await flushPendingCandidates(peerRecord);
                const answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);
                peerRecord.needsNegotiation = false;

                socket.emit('webrtc-answer', {
                    roomId,
                    answer,
                    target: senderId
                });
            } catch (error) {
                console.error('Error handling offer', error);
            }
        });

        socket.on('webrtc-answer', async ({ answer, senderId, target }) => {
            if (!isTargetedToCurrentUser(target)) {
                return;
            }

            const peerRecord = peersRef.current[senderId];
            if (!peerRecord) {
                return;
            }

            try {
                await peerRecord.connection.setRemoteDescription(new RTCSessionDescription(answer));
                peerRecord.ignoreOffer = false;
                await flushPendingCandidates(peerRecord);
            } catch (error) {
                console.error('Error setting remote description on answer', error);
            }
        });

        socket.on('ice-candidate', async ({ candidate, senderId, target }) => {
            if (!isTargetedToCurrentUser(target)) {
                return;
            }

            const peerRecord = peersRef.current[senderId];
            if (!peerRecord) {
                return;
            }

            try {
                if (!peerRecord.connection.remoteDescription) {
                    peerRecord.pendingCandidates.push(candidate);
                    return;
                }

                await peerRecord.connection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('Error adding received ICE candidate', error);
            }
        });

        socket.on('chat-message', (message) => {
            if (message.senderId !== user.id) {
                setMessages(prev => [...prev, message]);
            }
        });

        socket.on('reaction', (reaction) => {
            pushReaction(reaction);
        });

        socket.on('user-disconnected', ({ userId: remoteUserId }) => {
            if (peersRef.current[remoteUserId]) {
                peersRef.current[remoteUserId].connection.close();
                delete peersRef.current[remoteUserId];
            }

            removeParticipant(remoteUserId);
        });

        socket.on('connect', () => {
            socket.emit('join-room', roomId, user.id, user.name);
        });
    };

    const toggleMic = () => {
        const run = async () => {
            const audioTrack = localStreamRef.current?.getAudioTracks?.()[0];

            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicOn(audioTrack.enabled);
                return;
            }

            const nextEnabled = !isMicOn;
            setIsMicOn(nextEnabled);

            if (hasJoinedMeeting && nextEnabled) {
                const createdTrack = await ensureLocalTrack('audio');
                if (!createdTrack) {
                    setIsMicOn(false);
                }
            } else if (!hasJoinedMeeting) {
                await initializeLocalMedia({ micEnabled: nextEnabled, camEnabled: isCamOn });
            }
        };

        run();
    };

    const toggleCam = () => {
        const run = async () => {
            const videoTrack = localStreamRef.current?.getVideoTracks?.()[0];

            if (videoTrack) {
                const enabled = !videoTrack.enabled;
                syncTrackState(videoTrack, enabled);
                setIsCamOn(enabled);
                return;
            }

            const nextEnabled = !isCamOn;
            setIsCamOn(nextEnabled);

            if (hasJoinedMeeting && nextEnabled) {
                const createdTrack = await ensureLocalTrack('video');
                if (!createdTrack) {
                    setIsCamOn(false);
                }
            } else if (!hasJoinedMeeting) {
                await initializeLocalMedia({ micEnabled: isMicOn, camEnabled: nextEnabled });
            }
        };

        run();
    };

    const stopScreenShare = () => {
        const activeScreenStream = screenStreamRef.current;

        if (activeScreenStream) {
            removeTrackFromPeers('screen').catch(error => {
                console.error('Error removing screen share track', error);
            });

            activeScreenStream.getTracks().forEach(currentTrack => currentTrack.stop());
            screenStreamRef.current = null;
            setScreenStream(null);
        }

        const localVideoTrack = localStreamRef.current?.getVideoTracks?.()[0];
        setIsScreenSharing(false);
        setIsCamOn(localVideoTrack ? localVideoTrack.enabled : false);
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            stopScreenShare();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: false
            });

            screenStreamRef.current = stream;
            setScreenStream(stream);
            setIsScreenSharing(true);

            const track = stream.getVideoTracks()[0];
            await addTrackToPeers('screen', track);

            track.onended = () => {
                stopScreenShare();
            };
        } catch (error) {
            if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
                toast.error('Screen sharing was cancelled.');
            } else {
                console.error('Error sharing screen', error);
                toast.error('An error occurred while sharing the screen.');
            }
        }
    };

    const handleUpload = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const fileName = `${roomId}-${Date.now()}.webm`;

        toast('Uploading recording...');

        try {
            const { error } = await supabase.storage
                .from('recordings')
                .upload(fileName, blob, { contentType: 'video/webm' });

            if (error) {
                throw error;
            }

            const { data: publicData } = supabase.storage
                .from('recordings')
                .getPublicUrl(fileName);

            const token = await getValidToken();
            if (!token) {
                throw new Error('Session expired. Please log in again.');
            }

            const response = await fetch(`${API_URL}/recordings/save-metadata`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    room_code: roomId,
                    file_url: publicData.publicUrl
                })
            });

            if (!response.ok) {
                throw new Error('Metadata save failed');
            }

            toast.success('Recording uploaded and saved.');
            setMessages(prev => [...prev, {
                senderId: 'system',
                senderName: 'System',
                text: 'Recording uploaded. View it in your dashboard.',
                timestamp: new Date().toISOString()
            }]);
        } catch (error) {
            console.error(error);
            toast.error(`Recording upload failed: ${error.message}`);

            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = fileName;
            anchor.click();
            URL.revokeObjectURL(url);
        }
    };

    const startRecording = async () => {
        try {
            const captureStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: true
            });

            if (localStreamRef.current?.getAudioTracks().length) {
                audioContextRef.current = new AudioContext();
                const destination = audioContextRef.current.createMediaStreamDestination();

                if (captureStream.getAudioTracks().length > 0) {
                    const systemSource = audioContextRef.current.createMediaStreamSource(captureStream);
                    systemSource.connect(destination);
                }

                const micSource = audioContextRef.current.createMediaStreamSource(localStreamRef.current);
                micSource.connect(destination);

                if (captureStream.getAudioTracks().length > 0) {
                    captureStream.removeTrack(captureStream.getAudioTracks()[0]);
                }

                const mixedTrack = destination.stream.getAudioTracks()[0];
                if (mixedTrack) {
                    captureStream.addTrack(mixedTrack);
                }
            }

            recordedChunksRef.current = [];
            const mediaRecorder = new MediaRecorder(captureStream, { mimeType: 'video/webm' });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                await handleUpload();
                captureStream.getTracks().forEach(track => track.stop());
            };

            captureStream.getVideoTracks()[0].onended = () => {
                if (mediaRecorderRef.current?.state !== 'inactive') {
                    mediaRecorderRef.current.stop();
                }
                setIsRecording(false);
            };

            mediaRecorder.start(1000);
            setIsRecording(true);
            toast.success('Recording started');

            setMessages(prev => [...prev, {
                senderId: 'system',
                senderName: 'System',
                text: 'Recording started. It will be processed when stopped.',
                timestamp: new Date().toISOString()
            }]);
        } catch (error) {
            if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
                toast.error('Screen recording was cancelled.');
            } else {
                console.error(error);
                toast.error('Failed to start recording.');
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleSendMessage = (event) => {
        event.preventDefault();

        if (!chatMessage.trim() || !socketRef.current) {
            return;
        }

        const message = {
            roomId,
            senderId: user.id,
            senderName: user.name,
            text: chatMessage.trim()
        };

        socketRef.current.emit('chat-message', message);
        setMessages(prev => [...prev, {
            ...message,
            timestamp: new Date().toISOString(),
            isSelf: true
        }]);
        setChatMessage('');
    };

    const handleLeave = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }

        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
        }

        socketRef.current?.disconnect();
        navigate('/');
    };

    const handleSendReaction = (emoji) => {
        if (!socketRef.current) {
            return;
        }

        const reaction = {
            roomId,
            senderId: user.id,
            senderName: user.name,
            emoji
        };

        socketRef.current.emit('reaction', reaction);
        pushReaction({
            ...reaction,
            timestamp: new Date().toISOString()
        });
    };

    const handleJoinMeeting = async () => {
        let stream = localStreamRef.current;

        if (!stream && (isMicOn || isCamOn)) {
            stream = await initializeLocalMedia();

            if (!stream) {
                toast.error('Allow camera or microphone access, or disable them before joining.');
                return;
            }
        }

        if (stream) {
            applyPreferredTrackState(stream);
        }

        setupSocket();
        setHasJoinedMeeting(true);
    };

    if (!hasJoinedMeeting) {
        return (
            <MeetingLobby
                roomId={roomId}
                localStream={localStream}
                isPreparingMedia={isPreparingMedia}
                mediaError={mediaError}
                isMicOn={isMicOn}
                isCamOn={isCamOn}
                onToggleMic={toggleMic}
                onToggleCam={toggleCam}
                onJoinMeeting={handleJoinMeeting}
                onBack={handleLeave}
            />
        );
    }

    return (
        <div className="meeting-wrapper">
            <header className="meeting-header">
                <div className="logo" style={{ fontSize: '1.2rem' }}>
                    ZMeet
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'normal', marginLeft: '10px' }}>
                        Room: {roomId}
                    </span>
                </div>
                <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="btn"
                    style={{ background: 'transparent', color: isChatOpen ? 'var(--accent)' : 'white' }}
                >
                    <MessageSquare size={20} />
                </button>
            </header>

            <div className="meeting-body">
                <div className="video-area">
                    {reactions.length > 0 && (
                        <div style={{ position: 'absolute', top: '90px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '12px', zIndex: 20, pointerEvents: 'none', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '70%' }}>
                            {reactions.map(reaction => (
                                <div
                                    key={reaction.id}
                                    className="glass-panel"
                                    style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', animation: 'floatUp 2.4s ease forwards' }}
                                >
                                    <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{reaction.emoji}</span>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{reaction.senderName}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="video-grid">
                        <div className="video-wrapper">
                            <MediaStreamVideo stream={localStream} muted style={{ transform: 'scaleX(-1)' }} />
                            <div className="video-name">You (Camera)</div>
                        </div>

                        {isScreenSharing && (
                            <div className="video-wrapper screen-share-tile">
                                <MediaStreamVideo stream={screenStream} muted />
                                <div className="video-name">Your Screen</div>
                            </div>
                        )}

                        {Object.entries(remoteParticipants).flatMap(([peerId, participant]) => {
                            const tiles = [];

                            if (participant.audioStream) {
                                tiles.push(
                                    <MediaStreamAudio key={`${peerId}-audio`} stream={participant.audioStream} />
                                );
                            }

                            if (participant.screenStream) {
                                tiles.push(
                                    <div key={`${peerId}-screen`} className="video-wrapper screen-share-tile">
                                        <MediaStreamVideo stream={participant.screenStream} />
                                        <div className="video-name">Participant Screen</div>
                                    </div>
                                );
                            }

                            if (participant.cameraStream) {
                                tiles.push(
                                    <div key={`${peerId}-camera`} className="video-wrapper">
                                        <MediaStreamVideo stream={participant.cameraStream} />
                                        <div className="video-name">{participant.name}</div>
                                    </div>
                                );
                            }

                            if (!participant.cameraStream && !participant.screenStream) {
                                tiles.push(
                                    <div key={`${peerId}-placeholder`} className="video-wrapper">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', color: 'var(--text-muted)' }}>
                                            <div style={{ width: '72px', height: '72px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'white' }}>
                                                {(participant.name || 'P').slice(0, 1).toUpperCase()}
                                            </div>
                                            <span>{participant.name}</span>
                                        </div>
                                        <div className="video-name">{participant.name}</div>
                                    </div>
                                );
                            }

                            return tiles;
                        })}
                    </div>

                    <div className="controls-bar glass-panel" style={{ padding: '0 40px', height: '80px', borderRadius: '20px 20px 0 0', borderBottom: 'none' }}>
                        <button
                            onClick={toggleMic}
                            className={`icon-btn ${!isMicOn ? 'muted' : 'active'}`}
                            title={isMicOn ? 'Turn off mic' : 'Turn on mic'}
                        >
                            {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                        </button>

                        <button
                            onClick={toggleCam}
                            className={`icon-btn ${!isCamOn ? 'muted' : 'active'}`}
                            title={isCamOn ? 'Turn off camera' : 'Turn on camera'}
                        >
                            {isCamOn ? <Video size={24} /> : <VideoOff size={24} />}
                        </button>

                        <button onClick={toggleScreenShare} className={`icon-btn ${isScreenSharing ? 'active' : ''}`}>
                            <MonitorUp size={24} />
                        </button>

                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`icon-btn ${isRecording ? 'recording' : ''}`}
                            title={isRecording ? 'Stop recording' : 'Start recording'}
                        >
                            {isRecording ? <Square size={20} fill="currentColor" /> : <CircleDot size={24} />}
                        </button>

                        <button onClick={handleLeave} className="icon-btn leave">
                            <PhoneOff size={24} />
                        </button>
                    </div>
                </div>

                {isChatOpen && (
                    <div className="chat-panel">
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>Chat</div>

                        <div className="chat-messages">
                            {messages.map((message, index) => (
                                <div key={`${message.timestamp}-${index}`} className="chat-msg">
                                    <strong>{message.isSelf ? 'You' : message.senderName}</strong>
                                    {message.text}
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSendMessage} className="chat-input-area" style={{ background: 'var(--bg-secondary)' }}>
                            <input
                                type="text"
                                placeholder="Send a message..."
                                value={chatMessage}
                                onChange={(event) => setChatMessage(event.target.value)}
                            />
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {['👍', '😂', '🔥', '❤️'].map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        className="btn"
                                        onClick={() => handleSendReaction(emoji)}
                                        style={{ width: '44px', minWidth: '44px', padding: 0, background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'white' }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                            <button type="submit" className="btn primary-btn" style={{ width: 'auto' }}>
                                Send
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
