
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bttpqnuwspwlszzlapht.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4_B13I-ub3MVtDqMUgh0bg_yEN7ALTZ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
