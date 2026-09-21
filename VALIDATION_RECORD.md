# Local verification — 6.8.1 staging-gate-rc1

Production and staging baseline ZIP hashes matched supplied records. Both original baseline npm run check suites passed. The supplied production-only 6.8.1 candidate manifest and checks passed.

Revised shared candidate: node syntax/static validation, production and staging Worker regression suites, production and staging billing ordering suites, environment/project/key isolation tests, signed wrong-mode webhook rejection tests and price-mode checks passed locally. All network calls in the regression suites are mocks. Staging shell/editor label behavior passed automated response tests.

Wrangler 4.132.0 staging and production dry-run builds passed. package-lock.json pins the dependency graph. No publish command was run. Editor SHA-256 remains 659bde8be3a04f5c4bebc4b17f05f7b81ab7977a05098238d1d636a1343edd69, identical to the supplied language-update candidate.

Pending: installation in Codespace, local revalidation there, dashboard credentials/configuration review, current Worker rollback identifiers, deployed schema verification, staging deployment, browser/integration acceptance, release approval, production promotion and verification, final PDF manual. Browser tests reported by the other account are not counted as independent acceptance here.

Independent extracted-package verification: npm ci --ignore-scripts --no-audit --no-fund completed; automated suites and both Wrangler dry-run builds passed. Stale production-only README, release notes, launch cutover steps and validator were replaced before packaging. No live deployment occurred.
