/*
# Auto-create user perfil on signup

1. Changes
- Creates a trigger function that auto-inserts a row into usuarios_perfil
  when a new auth user is created, reading nome and papel from raw_user_meta_data
- Attaches the trigger to auth.users INSERT
- This fixes the race condition where signUp creates the auth user but the
  perfil insert fails because the session isn't established yet (RLS rejects it)

2. Security
- The trigger function is SECURITY DEFINER, bypassing RLS
- Defaults: nome = user's email, papel = 'vendedor' if metadata is missing
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios_perfil (id, nome, papel)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'papel', 'vendedor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();