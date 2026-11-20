# GFTA6-PAGES-RECOVERY-001 — Deployment retry analysis

## Evidence (20 November 2026)

- Merge commit from GFTA6 PR #11:
  `a45e5e2e9da36a6b8cc3600ca8d6929c36a459e6`
- Post-merge game CI: success — Actions run `44680679841`.
- Original Pages deployment: Actions run `44680679395`,
  attempt 1, publish job `136103045641`.
- Every validation and packaging step succeeded. The
  `github-pages` artifact was successfully uploaded (ID
  `14603404173`), SHA-256:
  `5ffab2ad801189d6b218a6870ffa28aa911c805369b8ebff7d4de584362da8f2`.
- GitHub Pages accepted the deployment request, then returned
  `Deployment failed, try again later.` No detailed deployment-side cause
  was present in the job logs. Do **not** claim this is a software, CI,
  server-wide outage or permissions defect without additional evidence.
- One retry of the **same job** was made (run `44680679395`,
  attempt 2, job `136105181729`). Validation and upload succeeded again,
  but the retry then failed because the run contained **two** artifacts
  both named `github-pages`. `actions/deploy-pages@v4` refuses to
  choose between ambiguous artifacts.
- GitHub's `punycode` Node deprecation warning appeared in the logs
  but did not cause the observed action failure.

## Remediation

Both official Pages Actions support explicit artifact names:

- `actions/upload-pages-artifact@v4`: `name`
- `actions/deploy-pages@v4`: `artifact_name`

Use the identical expression in both:
`github-pages-${{ github.run_id }}-${{ github.run_attempt }}`

This makes each future attempt select precisely its own uploaded artifact
instead of using the conflicting default name. It is a **retry hygiene fix**,
not proof that the original Pages service-side failure is corrected.

The workflow remains restricted to `main` for production deployment and
keeps explicit Pages/OIDC permissions and existing checks.

## Operational recovery

1. Review and merge the workflow correction PR after exact-head CI.
   The `main` push creates a **new workflow run** with a fresh artifact,
   which can publish the already-merged GFTA6 game.
2. If the new deployment fails with `Deployment failed, try again later`,
   inspect the new *first-attempt* deployment status. Check the GitHub
   status page and the repository's GitHub Pages Settings. Do not keep
   blindly retrying an unrelated stale run.
3. If necessary, dispatch a **new** `Publish GFTA6 to GitHub Pages`
   workflow from the Actions tab selecting `main`, rather than retrying
   the old pre-fix workflow run.
4. Verify the live site and offline service-worker cache before declaring
   deployment successful.

No game code, release assets or deployment secrets are changed by this fix.
