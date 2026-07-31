create unique index if not exists categories_user_active_name_type_unique
on public.categories (user_id, category_type, lower(name))
where is_archived = false;

create or replace function public.initialize_default_categories()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'initialize_default_categories requires an authenticated user.';
  end if;

  insert into public.categories (user_id, name, category_type, is_system)
  values
    (current_user_id, 'Salary', 'income', true),
    (current_user_id, 'Freelance', 'income', true),
    (current_user_id, 'Business', 'income', true),
    (current_user_id, 'Gift', 'income', true),
    (current_user_id, 'Other Income', 'income', true),
    (current_user_id, 'Food', 'expense', true),
    (current_user_id, 'Transport', 'expense', true),
    (current_user_id, 'Housing', 'expense', true),
    (current_user_id, 'Bills', 'expense', true),
    (current_user_id, 'Healthcare', 'expense', true),
    (current_user_id, 'Education', 'expense', true),
    (current_user_id, 'Shopping', 'expense', true),
    (current_user_id, 'Entertainment', 'expense', true),
    (current_user_id, 'Family', 'expense', true),
    (current_user_id, 'Other Expense', 'expense', true)
  on conflict (user_id, category_type, lower(name))
  where is_archived = false
  do nothing;
end;
$$;

revoke all on function public.initialize_default_categories() from public;
grant execute on function public.initialize_default_categories() to authenticated;

comment on function public.initialize_default_categories() is
  'Creates missing default income and expense categories for auth.uid(); accepts no user_id to prevent cross-user initialization.';
