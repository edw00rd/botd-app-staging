# B.O.T.D. — Cloudflare staging deploy via GitHub Actions

The staging repo (edw00rd/botd-app-staging) now has a deploy workflow at .github/workflows/deploy-staging.yml.

## One-time Cloudflare setup (no local npm needed)

1. In the Cloudflare dashboard, find the **Cloudflare Account ID** for the existing Worker named **botd-app-staging**.
2. Go to Cloudflare **Account API Tokens** and create a custom API token using **Edit Cloudflare Workers**, scoped to the smallest appropriate account and zone resources. Do not paste the secret into chat, source code, or an issue.
3. In GitHub, open **edw00rd/botd-app-staging > Settings > Environments** and create an environment named **staging** (optional: require a reviewer).
4. Add **Environment secrets** in this environment:
   - CLOUDFLARE_API_TOKEN = the Cloudflare API token
   - CLOUDFLARE_ACCOUNT_ID = the Cloudflare account ID
   Repository-level Actions secrets also work if environments are not configured.

## Manually deploy the V7 preview

1. Open https://github.com/edw00rd/botd-app-staging/actions/workflows/deploy-staging.yml
2. Click **Run workflow**. In the workflow branch selector, keep **main**.
3. Choose **feature/v7-cloud-playbook-foundation** as the **Reviewed staging source to deploy**.
4. Click **Run workflow** and review the build, guarded deployment, and health verification steps.
5. Open https://staging.botdhockey.com and verify the upper-left label shows **V7 Preview**.

## Future automatic deploys

Once the V7 release has passed staging acceptance and approved work is merged into the staging repo's main branch, every subsequent code push to **main** automatically runs the tests and publishes the staging Worker. Documentation-only, workflow-only and checksum-only changes do not deploy.

This workflow:
- is staging-only: only wrangler.jsonc, Worker botd-app-staging and staging Supabase are permitted;
- never calls deploy:production or touches edw00rd/botd-app-production;
- uses the existing guarded npm run deploy:staging release gate;
- runs npm ci, SHA256SUMS validation, npm run check, and a staging dry-run;
- enforces the staging Worker name, test URL, Supabase project, and keep_vars;
- deploys only with credentials stored in GitHub Secrets, and verifies the actively serving Worker version through Cloudflare's deployment API (the Access-protected HTTP health check is supplemental);
- provides serialized deploys and read-only GitHub token permissions.

Notes:
- Cloudflare's token can often be scoped by account rather than individual Worker; use the narrowest allowed token and protect main and the staging environment.
- Current V7 changes are still in draft PR #3. Installing this workflow alone does not deploy V7 or merge that PR.
- A failed workflow after the deploy step can mean the new Worker is already live but health verification failed. Check the job and staging URL before rerunning.
- For future versions, update the reviewed version constants and tests alongside code before promoting to staging.

Official Cloudflare guide: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
Official GitHub secrets guide: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets

## Cloudflare Access-protected health verification
Because `staging.botdhockey.com` requires a Cloudflare Access login, an unauthenticated GitHub runner receives an HTML login page instead of `/api/health` JSON. The workflow now parses Wrangler's `Current Version ID` and independently checks Cloudflare's authenticated deployments API to confirm that exact Worker version serves 100% of `botd-app-staging`. An HTTP health check is attempted once, but an Access login page does not falsely fail the deployment. Authorized browser acceptance is still required to validate UI, login, billing, and cloud saves. No Access bypass or additional secrets are required.
