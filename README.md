# Synthetic GitHub Pages publishing prototype

Proposed public repository: `aafadar-git/hercules-player-pages` (not created).
For this local prototype only, its example project path is `/hercules-player-pages/`.
The final repository name and path must be reviewed together; a different name fails
the workflow path check until the policy/code are explicitly updated.

Exactly five source files belong in the publishing repository:
`.github/workflows/pages.yml`, `scripts/pages-policy.json`,
`scripts/assemble-pages.mjs`, `tests/pages-assembly.test.mjs`, and this README.
No existing repository history, player source or binary assets are copied into Git.

The assembler generates exactly four deployment files: `index.html`, `app.js`,
`message.js`, and `assets/sentinel.bin`. The fixture is synthetic text plus four
small binary bytes; its exact bytes, size and SHA-256 are pinned in the policy and
independently checked by the assembler. There are no external input-file arguments,
private checkouts, game/BIOS bytes, package dependencies or asset-read secrets.
Existing output directories and symlinks are refused, and unrelated files are never
copied. Output belongs in a fresh directory outside this source tree.

Local validation (Node 22.23.3 or compatible):

```bash
node --test tests/pages-assembly.test.mjs
node scripts/assemble-pages.mjs /absolute/path/to/a/new/output-directory
```

The HTTP regression serves generated files under the project prefix and checks
exact response bytes, module MIME types, and rejection of accidental domain-root
asset URLs. A separate local Chromium smoke check verifies module execution and
the fetched fixture hash; it is not a dependency of the published Node tests.
These checks prove synthetic local loading only, not Pages hosting, private LFS
retrieval, real Hercules behavior, iPhone compatibility or public rights.

## Proposed actions, separately approved

1. Approve a final name, then create a new clean public repository. Keep game-test
   and hercules-private-assets private. Upload only these five reviewed source files.
2. Select Settings → Pages → Build and deployment → Source: GitHub Actions. Verify
   Actions availability and free usage/budgets. No external secrets are needed.
3. Review then separately approve one manual dispatch from main, with
   confirm_synthetic_publication=true. It uploads a synthetic-only Pages artifact
   (one-day retention) and publishes a live synthetic site, not a draft preview.
   It does not deploy on pushes or PRs. Do not dispatch during local preparation.

Standard public-repository runners are free; artifact storage is not assumed
unlimited. Pages has a 1 GB site limit, 10-minute deployment timeout and 100 GB/month
soft bandwidth limit. The artifact and final site are downloadable. Review billing
limits before execution. The upload action has its own network behavior and the
Pages action polls deployment status; no workflow-level rerun loop is included.
Full commit action pins were inspected. Pages v5 actions use Node 24 (the upload
wrapper pins upload-artifact v7 internally); Node 22 above is the project runtime.

## Real-player work is separate

No player candidate or source fingerprint is changed. A later reviewed player
revision would need relative `assets/hercules.pbp` and `assets/scph5501.bin` URLs in
public/config.js for project-path hosting (and a relative isolated ZIP-test path
if retained). Do not rewrite these during publishing assembly. Private source/LFS
checkouts, independently verified real assets, permission to redistribute game
and BIOS, and public artifact/publication approval are all future separate work.
GitHub's stated Pages/LFS limitation still needs resolution for that future route;
this synthetic prototype does not test or establish support for it.
