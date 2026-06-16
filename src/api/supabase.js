import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cssnsgdawdhrkrmztuas.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzc25zZ2Rhd2RocmtybXp0dWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NTQ0ODAsImV4cCI6MjA5MDQzMDQ4MH0.kgIhio0JuzprooZQXGg7zLmiOAMLbJjJCs58sKnCB58'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
