# Supabase setup

This app uses Supabase Auth and PostgreSQL, but only public client values belong in the Expo app.

## Create the project

1. Create a Supabase project from the Supabase dashboard.
2. Open Project Settings, then API.
3. Copy the Project URL.
4. Copy the publishable key. If your dashboard still labels it `anon`, use that anon public key.

## Environment values

Create a local `.env` file that is not committed:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`EXPO_PUBLIC_SUPABASE_ANON_KEY` is supported as a compatibility fallback, but the preferred name is `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Never put these credentials in the Expo app:

- service role key
- Supabase secret key
- database password
- JWT signing secret
- private backend credentials

Restart Expo after changing `.env` because Expo reads public environment variables at startup.

## Apply migrations manually

1. Open the Supabase dashboard.
2. Go to SQL Editor.
3. Open each migration in timestamp order:
   - `supabase/migrations/20260731020000_initial_auth_finance_foundation.sql`
   - `supabase/migrations/20260731093000_default_categories_rpc.sql`
   - `supabase/migrations/20260801090000_planning_budget_savings_layer.sql`
4. Paste the full SQL for one migration into the editor.
5. Run it once against the target project before applying the next migration.

The migrations create profiles, accounts, categories, transactions, budgets, savings goals and monthly finance plans. They enable RLS on every user-owned table.

## Authentication settings

1. Go to Authentication, then Providers.
2. Enable Email provider.
3. Keep email confirmation enabled for production-like testing.
4. Configure email templates as needed.

## Redirect URLs

For web development, add the Expo web origin you use, for example:

```text
http://localhost:8081
http://localhost:8081/reset-password
```

For a standalone app build, add:

```text
moneyheist://dashboard
moneyheist://reset-password
```

Expo Go development uses the Expo Go container and can make custom-scheme reset links inconsistent on Android. If a reset link does not open the Expo Go session directly, open the app manually and use the reset screen after Supabase establishes the recovery session on web, or test deep links in a development build later.

## RLS verification

Test with two separate email accounts.

1. Sign up as user A and user B.
2. Insert a row for user A with `user_id = auth.uid()` while authenticated as user A.
3. Query the same table as user B.
4. Confirm user B cannot read, update or delete user A rows.
5. Try creating a transaction for user B that references user A account IDs. The composite ownership foreign keys should reject it.

No policies use `USING (true)` for user-owned data, and anonymous users are not granted read access by RLS.

## Planning layer

Budgets, savings goals and monthly planning assumptions are persisted in Supabase.

Budget uniqueness:

- One active budget can exist for the same user, expense category, currency and exact calendar-month period.
- Archived budgets remain historical records and do not count as active planning.

Budget copying:

```sql
select public.copy_budgets_from_month('2026-07-01', '2026-08-01');
```

The RPC uses `auth.uid()`, accepts no user ID, copies only active budgets from the authenticated user, and skips duplicates.

Savings-goal source of truth:

- Each active or paused goal links to one active savings account.
- One savings account can be linked to only one active or paused goal.
- Goal progress is derived from the linked account's calculated balance.
- `current_amount_minor` remains in the database for compatibility, but the app does not use it as an independent manual balance.
- Add money or withdraw money by creating transfer transactions; do not update goal progress directly.

Monthly planning assumptions:

- `monthly_finance_plans` stores manually entered expected remaining income, upcoming fixed expenses, debt obligations and safety buffer.
- Recurring bills are not implemented yet, so these values are user estimates.
- Potential savings is calculated as available non-savings liquid cash plus expected remaining income, minus upcoming fixed expenses, remaining active budgets, debt obligations and safety buffer. Negative results display as zero.

## Default categories

After signing in, open Settings, then Manage categories, then choose Defaults. This calls:

```sql
select public.initialize_default_categories();
```

The RPC uses `auth.uid()`, accepts no user ID, and inserts only missing active category names. Running it twice should not create duplicates.

## First finance workflow

1. Sign in with a verified user.
2. Initialize default categories from Settings, Manage categories.
3. Create a cash account from Settings, Manage accounts.
4. Create a bank account.
5. Create a savings account and mark it as savings.
6. Add an income transaction into the bank account.
7. Add an expense transaction from cash or bank.
8. Add a transfer from bank to savings.
9. Confirm the dashboard income and expense totals do not include the transfer.
10. Confirm account balances update after every transaction.
11. Open a transaction detail screen and edit it.
12. Cancel a transaction and confirm it remains in history but leaves dashboard totals.
13. Create current-month budgets from Budgets.
14. Confirm matching expenses update budget usage and transfers do not.
15. Copy previous month's budgets from the Budgets screen and confirm duplicates are not created.
16. Create a savings account and then create a savings goal linked to it.
17. Transfer money into the linked savings account and confirm goal progress increases.
18. Transfer money out and confirm goal progress decreases.
19. Open Planning and enter monthly estimates.
20. Confirm dashboard potential-savings breakdown updates and savings-account balances are excluded from available cash.
21. Refresh web or reload Expo Go and confirm records persist.

## Two-user security check

1. Create two verified users.
2. As user A, create accounts, categories and transactions.
3. Sign out and sign in as user B.
4. Confirm user B sees no user A finance records.
5. Attempt direct inserts through the API or SQL impersonating user B while referencing user A account/category IDs. Composite ownership foreign keys should reject the records.
6. Repeat for budgets, savings goals and monthly finance plans. User B must not read, update or link to user A planning records.

## Development cache

React Query caches authenticated finance data under user-scoped keys beginning with `finance`. Signing out clears those finance queries. During development you can also fully reload Expo web or Expo Go to clear in-memory state.
