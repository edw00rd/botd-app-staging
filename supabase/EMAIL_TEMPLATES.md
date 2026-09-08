# Supabase staging email links

Use these links in the matching Supabase Authentication email templates. They
send the one-time token hash to the Worker, which verifies it server-side and
stores the resulting session in secure, HTTP-only cookies.

## Confirm signup

Replace the confirmation button/link target with:

```text
https://staging.botdhockey.com/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

## Reset password

Replace the reset button/link target with:

```text
https://staging.botdhockey.com/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
```

Keep the Supabase Site URL and allowed redirect URL configured as:

```text
Site URL: https://staging.botdhockey.com
Redirect URL: https://staging.botdhockey.com/**
```

The frontend also understands Supabase's legacy URL-fragment session format,
but the token-hash links above are preferred for staging.
