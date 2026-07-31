create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  currency_code text not null default 'BDT',
  timezone text not null default 'Asia/Dhaka',
  financial_month_start_day integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_currency_code_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint profiles_financial_month_start_day_check check (financial_month_start_day between 1 and 28),
  constraint profiles_full_name_length_check check (full_name is null or char_length(btrim(full_name)) between 1 and 160)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  account_type text not null,
  currency_code text not null default 'BDT',
  opening_balance_minor bigint not null default 0,
  is_savings boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_user_id_id_unique unique (user_id, id),
  constraint accounts_name_not_blank check (char_length(btrim(name)) > 0),
  constraint accounts_account_type_check check (
    account_type in ('cash', 'bank', 'mobile_wallet', 'savings', 'credit_card', 'investment', 'loan')
  ),
  constraint accounts_currency_code_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint accounts_opening_balance_safe_check check (abs(opening_balance_minor) <= 9007199254740991)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category_type text not null,
  icon_name text,
  is_system boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_user_id_id_unique unique (user_id, id),
  constraint categories_name_not_blank check (char_length(btrim(name)) > 0),
  constraint categories_category_type_check check (category_type in ('income', 'expense'))
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null,
  amount_minor bigint not null,
  currency_code text not null,
  account_id uuid not null,
  destination_account_id uuid,
  category_id uuid,
  occurred_at timestamptz not null,
  note text,
  transaction_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_amount_positive_check check (amount_minor > 0),
  constraint transactions_amount_safe_check check (amount_minor <= 9007199254740991),
  constraint transactions_currency_code_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint transactions_type_check check (transaction_type in ('income', 'expense', 'transfer', 'adjustment')),
  constraint transactions_status_check check (transaction_status in ('active', 'cancelled', 'deleted', 'inactive')),
  constraint transactions_shape_check check (
    (
      transaction_type = 'transfer'
      and destination_account_id is not null
      and category_id is null
      and account_id <> destination_account_id
    )
    or (
      transaction_type in ('income', 'expense')
      and destination_account_id is null
      and category_id is not null
    )
    or (
      transaction_type = 'adjustment'
      and destination_account_id is null
      and category_id is null
    )
  ),
  constraint transactions_account_owner_fk foreign key (user_id, account_id)
    references public.accounts(user_id, id) on delete restrict,
  constraint transactions_destination_account_owner_fk foreign key (user_id, destination_account_id)
    references public.accounts(user_id, id) on delete restrict,
  constraint transactions_category_owner_fk foreign key (user_id, category_id)
    references public.categories(user_id, id) on delete restrict
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null,
  period_start date not null,
  period_end date not null,
  limit_minor bigint not null,
  currency_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_limit_positive_check check (limit_minor > 0),
  constraint budgets_limit_safe_check check (limit_minor <= 9007199254740991),
  constraint budgets_period_check check (period_end >= period_start),
  constraint budgets_currency_code_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint budgets_category_owner_fk foreign key (user_id, category_id)
    references public.categories(user_id, id) on delete restrict
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_minor bigint not null,
  currency_code text not null,
  current_amount_minor bigint not null default 0,
  target_date date,
  status text not null default 'active',
  linked_account_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint savings_goals_name_not_blank check (char_length(btrim(name)) > 0),
  constraint savings_goals_target_positive_check check (target_minor > 0),
  constraint savings_goals_current_non_negative_check check (current_amount_minor >= 0),
  constraint savings_goals_amount_safe_check check (
    target_minor <= 9007199254740991 and current_amount_minor <= 9007199254740991
  ),
  constraint savings_goals_currency_code_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint savings_goals_status_check check (status in ('active', 'paused', 'completed', 'archived')),
  constraint savings_goals_linked_account_owner_fk foreign key (user_id, linked_account_id)
    references public.accounts(user_id, id) on delete restrict
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_full_name text;
begin
  metadata_full_name := left(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 160);

  insert into public.profiles (id, full_name, currency_code, timezone, financial_month_start_day)
  values (new.id, metadata_full_name, 'BDT', 'Asia/Dhaka', 1)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.enforce_transaction_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_currency text;
  destination_currency text;
  category_type_value text;
begin
  select currency_code into source_currency
  from public.accounts
  where user_id = new.user_id and id = new.account_id;

  if source_currency is null then
    raise exception 'Transaction source account is missing or not owned by the user.';
  end if;

  if source_currency <> new.currency_code then
    raise exception 'Transaction currency must match the source account currency.';
  end if;

  if new.transaction_type = 'transfer' then
    select currency_code into destination_currency
    from public.accounts
    where user_id = new.user_id and id = new.destination_account_id;

    if destination_currency is null then
      raise exception 'Transfer destination account is missing or not owned by the user.';
    end if;

    if destination_currency <> new.currency_code then
      raise exception 'Transfer currency must match the destination account currency.';
    end if;
  end if;

  if new.transaction_type in ('income', 'expense') then
    select category_type into category_type_value
    from public.categories
    where user_id = new.user_id and id = new.category_id;

    if category_type_value is null then
      raise exception 'Transaction category is missing or not owned by the user.';
    end if;

    if category_type_value <> new.transaction_type then
      raise exception 'Transaction category type must match transaction type.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_budget_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  category_type_value text;
begin
  select category_type into category_type_value
  from public.categories
  where user_id = new.user_id and id = new.category_id;

  if category_type_value <> 'expense' then
    raise exception 'Budgets must reference an expense category owned by the user.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_savings_goal_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_account_currency text;
begin
  if new.linked_account_id is null then
    return new;
  end if;

  select currency_code into linked_account_currency
  from public.accounts
  where user_id = new.user_id and id = new.linked_account_id;

  if linked_account_currency is null then
    raise exception 'Linked savings account is missing or not owned by the user.';
  end if;

  if linked_account_currency <> new.currency_code then
    raise exception 'Savings goal currency must match the linked account currency.';
  end if;

  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

create trigger savings_goals_set_updated_at
before update on public.savings_goals
for each row execute function public.set_updated_at();

create trigger transactions_enforce_integrity
before insert or update on public.transactions
for each row execute function public.enforce_transaction_integrity();

create trigger budgets_enforce_integrity
before insert or update on public.budgets
for each row execute function public.enforce_budget_integrity();

create trigger savings_goals_enforce_integrity
before insert or update on public.savings_goals
for each row execute function public.enforce_savings_goal_integrity();

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;

create policy profiles_select_own on public.profiles
for select to authenticated
using (id = auth.uid());

create policy profiles_insert_own on public.profiles
for insert to authenticated
with check (id = auth.uid());

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy accounts_select_own on public.accounts
for select to authenticated
using (user_id = auth.uid());

create policy accounts_insert_own on public.accounts
for insert to authenticated
with check (user_id = auth.uid());

create policy accounts_update_own on public.accounts
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy accounts_delete_own on public.accounts
for delete to authenticated
using (user_id = auth.uid());

create policy categories_select_own on public.categories
for select to authenticated
using (user_id = auth.uid());

create policy categories_insert_own on public.categories
for insert to authenticated
with check (user_id = auth.uid());

create policy categories_update_own on public.categories
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy categories_delete_own on public.categories
for delete to authenticated
using (user_id = auth.uid());

create policy transactions_select_own on public.transactions
for select to authenticated
using (user_id = auth.uid());

create policy transactions_insert_own on public.transactions
for insert to authenticated
with check (user_id = auth.uid());

create policy transactions_update_own on public.transactions
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy transactions_delete_own on public.transactions
for delete to authenticated
using (user_id = auth.uid());

create policy budgets_select_own on public.budgets
for select to authenticated
using (user_id = auth.uid());

create policy budgets_insert_own on public.budgets
for insert to authenticated
with check (user_id = auth.uid());

create policy budgets_update_own on public.budgets
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy budgets_delete_own on public.budgets
for delete to authenticated
using (user_id = auth.uid());

create policy savings_goals_select_own on public.savings_goals
for select to authenticated
using (user_id = auth.uid());

create policy savings_goals_insert_own on public.savings_goals
for insert to authenticated
with check (user_id = auth.uid());

create policy savings_goals_update_own on public.savings_goals
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy savings_goals_delete_own on public.savings_goals
for delete to authenticated
using (user_id = auth.uid());

create index profiles_updated_at_idx on public.profiles(updated_at);
create index accounts_user_id_idx on public.accounts(user_id);
create index accounts_user_id_type_idx on public.accounts(user_id, account_type);
create index categories_user_id_idx on public.categories(user_id);
create index categories_user_id_type_idx on public.categories(user_id, category_type);
create index transactions_user_id_idx on public.transactions(user_id);
create index transactions_user_id_occurred_at_idx on public.transactions(user_id, occurred_at desc);
create index transactions_user_id_type_idx on public.transactions(user_id, transaction_type);
create index transactions_account_id_idx on public.transactions(account_id);
create index transactions_destination_account_id_idx on public.transactions(destination_account_id);
create index transactions_category_id_idx on public.transactions(category_id);
create index budgets_user_id_idx on public.budgets(user_id);
create index budgets_user_id_period_idx on public.budgets(user_id, period_start, period_end);
create index budgets_category_id_idx on public.budgets(category_id);
create index savings_goals_user_id_idx on public.savings_goals(user_id);
create index savings_goals_user_id_status_idx on public.savings_goals(user_id, status);
create index savings_goals_linked_account_id_idx on public.savings_goals(linked_account_id);

comment on constraint transactions_account_owner_fk on public.transactions is
  'Composite foreign key ensures a transaction source account belongs to the same user_id as the transaction.';
comment on constraint transactions_destination_account_owner_fk on public.transactions is
  'Composite foreign key ensures transfer destination accounts cannot reference another user account.';
comment on constraint transactions_category_owner_fk on public.transactions is
  'Composite foreign key ensures income and expense categories are owned by the same user as the transaction.';
comment on constraint budgets_category_owner_fk on public.budgets is
  'Composite foreign key prevents budgets from referencing another user category.';
comment on constraint savings_goals_linked_account_owner_fk on public.savings_goals is
  'Composite foreign key prevents savings goals from linking another user account.';
