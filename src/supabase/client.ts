// AtlasFlow - Supabase client setup
// Simple connection to Supabase for auth and data

import { createClient } from '@supabase/supabase-js'

// --- Section: Environment variables ---
// These come from .env file - never hardcode keys here
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// --- Section: Create the client ---
// This is the main connection we use everywhere
export const supabase = createClient(supabaseUrl, supabaseAnonKey)