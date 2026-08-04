-- Fix SECURITY DEFINER views to use SECURITY INVOKER so RLS policies are enforced
-- profiles view: exposes app_users data - must use invoker's RLS
ALTER VIEW public.profiles SET (security_invoker = true);
ALTER VIEW public.pets SET (security_invoker = true);
ALTER VIEW public.current_user_pet SET (security_invoker = true);
ALTER VIEW public.message_reads SET (security_invoker = true);
