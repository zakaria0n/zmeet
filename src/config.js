import { createClient } from '@supabase/supabase-js';

export const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://zmeet-backend.onrender.com/api';

export const SOCKET_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://zmeet-backend.onrender.com';

export const SUPABASE_URL = 'https://ufalawtpgydtdxvhgujw.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmYWxhd3RwZ3lkdGR4dmhndWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjgxNzEsImV4cCI6MjA4ODY0NDE3MX0.M86UVWITvZBJ3Y-rnX_DxJThRBtikYdV7TYc-b_OsGY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
