import { createClient } from '@supabase/supabase-js';

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) return null;

  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user?.id || null;
}
