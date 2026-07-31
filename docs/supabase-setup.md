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
3. Open `supabase/migrations/20260731020000_initial_auth_finance_foundation.sql`.
4. Paste the full SQL into the editor.
5. Run it once against the target project.

The migration creates profiles, accounts, categories, transactions, budgets and savings goals. It enables RLS on every user-owned table.

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

## Demo finance data

The app still displays local demo finance data after login. It is not inserted into Supabase and is not synced. Finance persistence should be connected in a later phase.
