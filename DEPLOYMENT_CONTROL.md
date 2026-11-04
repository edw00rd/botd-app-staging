# Deployment Authority

B.O.T.D. Workers are deployed through the guarded GitHub Actions workflows in
`edw00rd/botd-cloudflare-ops`.

Cloudflare Workers Builds / direct Git integration was intentionally disconnected
on 2026-11-04 so repository pushes cannot deploy staging or production outside
the guarded release path.
