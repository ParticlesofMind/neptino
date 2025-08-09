/**
 * Simple Supabase Client Setup
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rwjzjxkrymnxlcaorjvo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3anpqeGtyeW1ueGxjYW9yanZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3ODI4ODQsImV4cCI6MjA0OTM1ODg4NH0.HrYMNK8POVgxGVDrGlKE6QbSw4c2S-b6hbWw7qnV-jA'

export const supabase = createClient(supabaseUrl, supabaseKey)
