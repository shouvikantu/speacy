-- Add full_name column to profiles table if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'full_name') then
        alter table public.profiles add column full_name text;
    end if;
end $$;

-- Re-create the trigger function to ensure it uses the new column
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    'student', -- Default role
    new.raw_user_meta_data->>'full_name' -- Extract name from metadata
  );
  return new;
end;
$$;
