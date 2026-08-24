# Brevo SMTP — replaces Gmail for all app + growth email

Brevo free tier: 300 emails/day, proper deliverability, no login-lockouts
(the Gmail 454 problem class disappears). The app needs no code change —
the mailer reads generic SMTP env vars.

## Server .env (C:\pulse\apps\api\.env) — replace the Gmail SMTP block

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your Brevo SMTP login — shown at app.brevo.com → SMTP & API → SMTP tab, usually like 8xxxxx001@smtp-brevo.com>
SMTP_PASS=<the xsmtpsib-… SMTP key>
SMTP_FROM=PULSE <no-reply@geddo.online>
```

> The SMTP key was shared in chat — after setup works, it costs nothing to
> regenerate it once in Brevo (SMTP & API → delete + create key) and paste the
> new one here. Keys shared over any channel are best rotated.

## One-time in Brevo (10 minutes, big deliverability win)

1. **Senders & Domains → Domains → Add** `geddo.online` → Brevo shows 2-3 DNS
   records (DKIM + brevo-code TXT). Add them at your DNS host, click Verify.
   Authenticated domain = inbox instead of spam.
2. **Senders**: add `no-reply@geddo.online` (and `growth@geddo.online` for the
   Growth team outreach later).
3. Restart the pulse-api service, then Admin → check SMTP → should be green.

## Sending etiquette (so the domain stays clean)

- The app's own throttle (1 email / 1.5s, pooled) already fits Brevo.
- Broadcasts stay ≤300 recipients/day (the free cap) — the composer's counts
  tell you before sending.
- Growth outreach: start at ≤20 cold emails/day for the first two weeks
  (warm-up), then grow. New domains that blast 200 on day one get junk-foldered.
