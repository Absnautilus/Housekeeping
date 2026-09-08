import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createCreateStaffAccountHandler } from './handler.ts'

Deno.serve(createCreateStaffAccountHandler({
  createClient,
  getEnv: (name) => Deno.env.get(name),
}))
