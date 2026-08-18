/* Configuração pública do Supabase para o navegador. */
const SUPABASE_URL = "https://mvzcoaiiwytycdqcvydf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Mv7A4NxC6zr1s7Ob1ROEUw_Au212ibY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
