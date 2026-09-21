# v6.8.1 — staging-gate-rc1

Status: undeployed candidate, pending staging acceptance and owner approval.

The language update renames US English to English, removes Canadian English, and normalizes legacy en-CA to en-US. Other languages and account-scoped v6_8 browser storage remain supported.

The shared Worker adds explicit environment/project isolation, mode-specific Stripe checks and staging labels. Separate staging and production Wrangler configurations and build commands are included. The release workflow requires local validation, staging browser/integration tests, explicit approval, and promotion of the same source commit. These infrastructure changes broaden the scope beyond the original language-only patch and require billing/authentication regression acceptance.

No SQL migration is executed. Reference schemas are included separately for staging and production. Deployed constraints, credentials and webhook delivery still need verification.

Protected editor SHA-256: 659bde8be3a04f5c4bebc4b17f05f7b81ab7977a05098238d1d636a1343edd69
Health identities: 6.8.1-staging-v3 and 6.8.1-production-v3.

See RELEASE_PROCEDURE.md and VALIDATION_RECORD.md for steps and actual evidence.
