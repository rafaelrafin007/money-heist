alter table public.budgets
add column if not exists status text not null default 'active';

alter table public.budgets
drop constraint if exists budgets_status_check;

alter table public.budgets
add constraint budgets_status_check check (status in ('active', 'archived'));

create unique index if not exists budgets_user_active_category_currency_period_unique
on public.budgets (user_id, category_id, currency_code, period_start, period_end)
where status = 'active';

create index if not exists budgets_user_id_status_period_idx
on public.budgets (user_id, status, period_start, period_end);

create unique index if not exists savings_goals_user_active_linked_account_unique
on public.savings_goals (user_id, linked_account_id)
where status in ('active', 'paused') and linked_account_id is not null;

create index if not exists savings_goals_user_id_linked_status_idx
on public.savings_goals (user_id, linked_account_id, status);

create or replace function public.enforce_savings_goal_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_account_currency text;
  linked_account_is_savings boolean;
  linked_account_is_archived boolean;
  linked_account_type text;
begin
  if new.linked_account_id is null then
    if new.status in ('active', 'paused') then
      raise exception 'Active and paused savings goals must be linked to a savings account.';
    end if;

    return new;
  end if;

  select currency_code, is_savings, is_archived, account_type
  into linked_account_currency, linked_account_is_savings, linked_account_is_archived, linked_account_type
  from public.accounts
  where user_id = new.user_id and id = new.linked_account_id;

  if linked_account_currency is null then
    raise exception 'Linked savings account is missing or not owned by the user.';
  end if;

  if linked_account_currency <> new.currency_code then
    raise exception 'Savings goal currency must match the linked account currency.';
  end if;

  if linked_account_is_savings is not true or linked_account_type in ('credit_card', 'loan') then
    raise exception 'Savings goals must link to an asset account marked as savings.';
  end if;

  if new.status in ('active', 'paused') and linked_account_is_archived is true then
    raise exception 'Active and paused savings goals cannot link to archived savings accounts.';
  end if;

  return new;
end;
$$;

create table if not exists public.monthly_finance_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  currency_code text not null default 'BDT',
  expected_remaining_income_minor bigint not null default 0,
  upcoming_fixed_expenses_minor bigint not null default 0,
  debt_obligations_minor bigint not null default 0,
  safety_buffer_minor bigint not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_finance_plans_month_start_check check (month_start = date_trunc('month', month_start)::date),
  constraint monthly_finance_plans_currency_code_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint monthly_finance_plans_amounts_non_negative_check check (
    expected_remaining_income_minor >= 0
    and upcoming_fixed_expenses_minor >= 0
    and debt_obligations_minor >= 0
    and safety_buffer_minor >= 0
  ),
  constraint monthly_finance_plans_amounts_safe_check check (
    expected_remaining_income_minor <= 9007199254740991
    and upcoming_fixed_expenses_minor <= 9007199254740991
    and debt_obligations_minor <= 9007199254740991
    and safety_buffer_minor <= 9007199254740991
  ),
  constraint monthly_finance_plans_user_month_currency_unique unique (user_id, month_start, currency_code)
);

drop trigger if exists monthly_finance_plans_set_updated_at on public.monthly_finance_plans;
create trigger monthly_finance_plans_set_updated_at
before update on public.monthly_finance_plans
for each row execute function public.set_updated_at();

alter table public.monthly_finance_plans enable row level security;

drop policy if exists monthly_finance_plans_select_own on public.monthly_finance_plans;
create policy monthly_finance_plans_select_own on public.monthly_finance_plans
for select to authenticated
using (user_id = auth.uid());

drop policy if exists monthly_finance_plans_insert_own on public.monthly_finance_plans;
create policy monthly_finance_plans_insert_own on public.monthly_finance_plans
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists monthly_finance_plans_update_own on public.monthly_finance_plans;
create policy monthly_finance_plans_update_own on public.monthly_finance_plans
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists monthly_finance_plans_delete_own on public.monthly_finance_plans;
create policy monthly_finance_plans_delete_own on public.monthly_finance_plans
for delete to authenticated
using (user_id = auth.uid());

create index if not exists monthly_finance_plans_user_id_idx
on public.monthly_finance_plans (user_id);

create index if not exists monthly_finance_plans_user_month_idx
on public.monthly_finance_plans (user_id, month_start desc);

create or replace function public.copy_budgets_from_month(source_month_start date, target_month_start date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  inserted_count integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'copy_budgets_from_month requires an authenticated user.';
  end if;

  if source_month_start <> date_trunc('month', source_month_start)::date
    or target_month_start <> date_trunc('month', target_month_start)::date then
    raise exception 'Budget copy months must be first-day-of-month dates.';
  end if;

  insert into public.budgets (
    user_id,
    category_id,
    period_start,
    period_end,
    limit_minor,
    currency_code,
    status
  )
  select
    current_user_id,
    source_budget.category_id,
    target_month_start,
    (target_month_start + interval '1 month - 1 day')::date,
    source_budget.limit_minor,
    source_budget.currency_code,
    'active'
  from public.budgets source_budget
  where source_budget.user_id = current_user_id
    and source_budget.period_start = source_month_start
    and source_budget.period_end = (source_month_start + interval '1 month - 1 day')::date
    and source_budget.status = 'active'
    and not exists (
      select 1
      from public.budgets target_budget
      where target_budget.user_id = current_user_id
        and target_budget.category_id = source_budget.category_id
        and target_budget.currency_code = source_budget.currency_code
        and target_budget.period_start = target_month_start
        and target_budget.period_end = (target_month_start + interval '1 month - 1 day')::date
        and target_budget.status = 'active'
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.copy_budgets_from_month(date, date) from public;
grant execute on function public.copy_budgets_from_month(date, date) to authenticated;

comment on function public.copy_budgets_from_month(date, date) is
  'Copies only auth.uid() active budgets between calendar months, without accepting a user_id or creating duplicates.';

comment on index public.budgets_user_active_category_currency_period_unique is
  'Prevents duplicate active budgets for the same user, expense category, currency, and exact month period.';

comment on index public.savings_goals_user_active_linked_account_unique is
  'Enforces the MVP rule: one active or paused savings goal per linked savings account.';
