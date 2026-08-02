# Manual QA Checklist

Use a verified Supabase test user and a fresh test user before release testing. Do not use real personal financial data for exploratory QA.

## Onboarding

- New user sees onboarding once after sign-in.
- Skip takes the user to the dashboard.
- Get started can open account creation.
- Settings can replay onboarding.
- Setup checklist actions navigate to the correct screens.
- Dismissing the checklist hides it only for the current signed-in user.

## Charts and Insights

- Empty account shows honest chart empty states.
- One month of income and expenses appears in cash flow.
- Six months of records render without layout overflow.
- Large amounts remain readable.
- Long category names do not overlap chart values.
- Only the selected currency appears in chart totals.
- Charts remain readable on a small Android phone.
- Charts remain readable in a narrow web window.

## Forms

- Android keyboard does not cover focused fields.
- Validation messages appear near the relevant field.
- Failed saves preserve entered values.
- Repeated taps do not create duplicate records.
- Long notes remain editable.
- Today, Yesterday, and custom date inputs save the expected date.
- Archived accounts and categories cannot be selected for new transactions.
- Save money creates a transfer into a savings account.
- Currency mismatch prevents transfers.

## Accessibility

- Large text remains usable on all main screens.
- Buttons have clear screen-reader names.
- Progress values have accessible text.
- Chart summaries are understandable without color.
- Web keyboard navigation can reach form fields and actions.

## Reliability

- Pull-to-refresh or retry actions reload failed data where available.
- Browser refresh keeps authenticated users in protected screens.
- Closing and reopening Expo Go restores a valid session.
- Logout clears private finance data from the visible app.
- Logging in as another user does not flash previous-user records.
- Failed network requests show safe retry wording.
- New users with no accounts see zero totals and first-use actions.
