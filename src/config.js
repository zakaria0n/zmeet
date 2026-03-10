import { createClient } from '@supabase/supabase-js';

export const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://zmeet-backend.onrender.com/api';

export const SOCKET_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://zmeet-backend.onrender.com';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const TURN_URL = import.meta.env.VITE_TURN_URL;
export const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME;
export const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL;

export const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    ...(TURN_URL && TURN_USERNAME && TURN_CREDENTIAL ? [{
        urls: TURN_URL,
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL
    }] : [])
];

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
