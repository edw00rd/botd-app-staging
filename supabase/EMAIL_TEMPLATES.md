# Supabase staging email links

## Current staging setup: default Supabase mailer

No template edit is required for RC3. Keep:

```text
Site URL: https://staging.botdhockey.com
Allowed redirect URL: https://staging.botdhockey.com/**
```

The Worker requests the staging root as the confirmation or recovery redirect.
Supabase's default `{{ .ConfirmationURL }}` link returns an implicit session in
the URL fragment. The public shell immediately removes those credentials from
the address bar and sends them to the Worker for validation and secure,
HTTP-only cookie storage.

Supabase's built-in mailer is appropriate only for limited staging tests and
has a very small shared email quota.

## Future company-controlled SMTP

Before production, configure FENRIR LLC-controlled transactional SMTP and
branded templates. At that stage, the preferred server-side token-hash links
are:

### Confirm signup

```text
https://app.botdhockey.com/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

### Reset password

```text
https://app.botdhockey.com/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
```

The production hostname, sender address, SPF, DKIM, DMARC alignment,
deliverability monitoring, and exact callback URLs must be verified during the
production SMTP phase.
