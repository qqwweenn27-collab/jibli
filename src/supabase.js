import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://hsgqqugojpeynmxiktrx.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_M5okA1lwG2OEif5cMVYCiA_763LRInd'

export const supabase = createClient(url, key)
