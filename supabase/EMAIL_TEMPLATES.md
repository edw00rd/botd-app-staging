# Production Supabase email configuration

Copyright © 2026 FENRIR LLC. All rights reserved.

Configure these settings in the separate `botd-production` Supabase project.

## URL configuration

```text
Site URL: https://app.botdhockey.com
Allowed redirect URL: https://app.botdhockey.com/**
```

Do not add the staging hostname to the production project. The temporary
`launch.botdhockey.com/**` redirect may remain allow-listed briefly during
cutover, then should be removed after production verification.

## SMTP

Use a production-specific Resend SMTP credential rather than the staging
credential.

```text
Sender name: B.O.T.D. Hockey Playbook Studio
Sender email: fenrir@botdhockey.com
Host: smtp.resend.com
Port: use the port confirmed in the Resend SMTP documentation/dashboard
Username: resend
Password: production-specific Resend credential
Minimum interval per user: 60 seconds
```

Store the SMTP password only in Supabase's encrypted SMTP settings and the
company password manager.

## Confirm signup

Subject:

```text
Confirm your B.O.T.D. account
```

HTML body:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Confirm your B.O.T.D. account</title>
  </head>
  <body style="margin:0;padding:0;background-color:#edf3f8;color:#102133;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Confirm your email address to finish creating your B.O.T.D. account.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#edf3f8;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 28px rgba(15,39,64,.12);">
            <tr>
              <td align="center" style="padding:32px 32px 28px;background-color:#071827;border-bottom:4px solid #f15a24;">
                <img src="https://botdhockey.com/assets/botd-dog-tag.png" width="96" alt="B.O.T.D. Hockey Playbook Studio" style="display:block;width:96px;max-width:96px;height:auto;margin:0 auto 16px;border:0;outline:none;text-decoration:none;">
                <div style="font-size:13px;line-height:18px;font-weight:700;letter-spacing:1.6px;color:#69c6ed;text-transform:uppercase;">B.O.T.D. Hockey</div>
                <div style="margin-top:5px;font-size:25px;line-height:32px;font-weight:800;color:#ffffff;">Playbook Studio</div>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 42px 34px;">
                <h1 style="margin:0 0 18px;font-size:28px;line-height:36px;color:#102b42;font-weight:800;">Confirm your account</h1>
                <p style="margin:0 0 18px;font-size:16px;line-height:25px;color:#41576a;">Confirm your email address to finish creating your B.O.T.D. Hockey Playbook Studio account.</p>
                <p style="margin:0 0 28px;font-size:16px;line-height:25px;color:#41576a;">Select the button below to verify your address.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
                  <tr>
                    <td align="center" bgcolor="#167cab" style="border-radius:8px;">
                      <a href="https://app.botdhockey.com/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email" style="display:inline-block;padding:15px 28px;font-size:16px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">Confirm email address</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#687b89;">If the button does not work, copy and paste this address into your browser:</p>
                <p style="margin:0;font-size:12px;line-height:19px;word-break:break-all;"><a href="https://app.botdhockey.com/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email" style="color:#126c99;text-decoration:underline;">https://app.botdhockey.com/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email</a></p>
                <p style="margin:28px 0 0;font-size:14px;line-height:22px;color:#687b89;">If you did not create this account, you can safely ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:25px 30px;background-color:#f7fafc;border-top:1px solid #dde7ee;">
                <p style="margin:0 0 7px;font-size:13px;line-height:20px;font-weight:700;color:#243d50;">B.O.T.D. Hockey Playbook Studio</p>
                <p style="margin:0 0 10px;font-size:12px;line-height:19px;color:#738390;">A FENRIR LLC product</p>
                <p style="margin:0;font-size:12px;line-height:19px;color:#738390;"><a href="mailto:support@botdhockey.com" style="color:#126c99;text-decoration:none;">Support</a> &nbsp;&bull;&nbsp; <a href="https://botdhockey.com/privacy/" style="color:#126c99;text-decoration:none;">Privacy</a> &nbsp;&bull;&nbsp; <a href="https://botdhockey.com/terms/" style="color:#126c99;text-decoration:none;">Terms</a></p>
                <p style="margin:12px 0 0;font-size:11px;line-height:17px;color:#8a98a3;">Copyright &copy; 2026 FENRIR LLC. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Reset password

Subject:

```text
Reset your B.O.T.D. Hockey Playbook Studio password
```

HTML body:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset your B.O.T.D. password</title>
  </head>
  <body style="margin:0;padding:0;background-color:#edf3f8;color:#102133;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Choose a new password for your B.O.T.D. Hockey Playbook Studio account.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#edf3f8;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 28px rgba(15,39,64,.12);">
            <tr>
              <td align="center" style="padding:32px 32px 28px;background-color:#071827;border-bottom:4px solid #f15a24;">
                <img src="https://botdhockey.com/assets/botd-dog-tag.png" width="96" alt="B.O.T.D. Hockey Playbook Studio" style="display:block;width:96px;max-width:96px;height:auto;margin:0 auto 16px;border:0;outline:none;text-decoration:none;">
                <div style="font-size:13px;line-height:18px;font-weight:700;letter-spacing:1.6px;color:#69c6ed;text-transform:uppercase;">B.O.T.D. Hockey</div>
                <div style="margin-top:5px;font-size:25px;line-height:32px;font-weight:800;color:#ffffff;">Playbook Studio</div>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 42px 34px;">
                <h1 style="margin:0 0 18px;font-size:28px;line-height:36px;color:#102b42;font-weight:800;">Reset your password</h1>
                <p style="margin:0 0 18px;font-size:16px;line-height:25px;color:#41576a;">We received a request to reset the password for your B.O.T.D. Hockey Playbook Studio account.</p>
                <p style="margin:0 0 28px;font-size:16px;line-height:25px;color:#41576a;">Select the button below to choose a new password.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
                  <tr>
                    <td align="center" bgcolor="#167cab" style="border-radius:8px;">
                      <a href="https://app.botdhockey.com/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery" style="display:inline-block;padding:15px 28px;font-size:16px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">Choose a new password</a>
                    </td>
                  </tr>
                </table>
                <div style="padding:16px 18px;background-color:#f1f7fa;border-left:4px solid #167cab;border-radius:6px;">
                  <p style="margin:0;font-size:14px;line-height:22px;color:#4c6172;"><strong style="color:#18384f;">Security note:</strong> Use the newest reset email you received. Older reset links may no longer be valid.</p>
                </div>
                <p style="margin:26px 0 8px;font-size:14px;line-height:22px;color:#687b89;">If the button does not work, copy and paste this address into your browser:</p>
                <p style="margin:0;font-size:12px;line-height:19px;word-break:break-all;"><a href="https://app.botdhockey.com/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery" style="color:#126c99;text-decoration:underline;">https://app.botdhockey.com/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery</a></p>
                <p style="margin:28px 0 0;font-size:14px;line-height:22px;color:#687b89;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:25px 30px;background-color:#f7fafc;border-top:1px solid #dde7ee;">
                <p style="margin:0 0 7px;font-size:13px;line-height:20px;font-weight:700;color:#243d50;">B.O.T.D. Hockey Playbook Studio</p>
                <p style="margin:0 0 10px;font-size:12px;line-height:19px;color:#738390;">A FENRIR LLC product</p>
                <p style="margin:0;font-size:12px;line-height:19px;color:#738390;"><a href="mailto:support@botdhockey.com" style="color:#126c99;text-decoration:none;">Support</a> &nbsp;&bull;&nbsp; <a href="https://botdhockey.com/privacy/" style="color:#126c99;text-decoration:none;">Privacy</a> &nbsp;&bull;&nbsp; <a href="https://botdhockey.com/terms/" style="color:#126c99;text-decoration:none;">Terms</a></p>
                <p style="margin:12px 0 0;font-size:11px;line-height:17px;color:#8a98a3;">Copyright &copy; 2026 FENRIR LLC. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Verification

Reopen both saved templates and confirm that each contains two references to
`https://app.botdhockey.com/auth/confirm`, no references to the launch or
staging hostnames, and one public logo reference to
`https://botdhockey.com/assets/botd-dog-tag.png`.
