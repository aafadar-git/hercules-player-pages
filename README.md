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

## Proposed interface-only publication (local review; not deployed)

The repository now exists publicly at aafadar-git/hercules-player-pages. The text
above describes the preserved original synthetic prototype and its prior plan.
This proposal is based on main 1ffd77c1f72698be7c43bce9e743da5708178f8e.

The interface comes from the maintained local player's public/index.html and
public/style.css, not a simulated loading page. CSS is copied byte-for-byte.
HTML retains its real layout, removes the app module, tightens CSP to prohibit
scripts/connect/workers, disables Play and playback controls, and adds explicit
unavailable/availability text. No emulator canvas or virtual controls are faked.
Visitors can read the actual initial player UI and expand availability details;
there is no gameplay, fullscreen, audio, save/load, startup or recovery attempt.
The original maintained player remains untouched.

Interface deployment output is exactly index.html and style.css. Nothing from
config.js, app.js, diagnostics modules, data/, vendor/, assets/, node_modules/,
private repositories or the runtime-research candidates is assembled. No loaders,
cores, WASM, game, BIOS, extraction workers, fonts, images or third-party scripts
are fetched or copied. No external requests are initiated by the page. The output
is public/downloadable source HTML/CSS; it contains no game or BIOS. Emulator/core
corresponding-source issues do not apply to absent runtime code. Project-interface
HTML/CSS publication permission is required; no third-party runtime license is
assumed to authorize it. No new blanket license is asserted for project files.

Validation:

    node --test tests/pages-assembly.test.mjs tests/interface-assembly.test.mjs
    node scripts/assemble-interface.mjs /absolute/fresh/output-directory

The original synthetic assembler, policy and loading tests are preserved. Only its
workflow-policy assertion is updated for the explicitly confirmed additional mode.
The manual workflow retains pinned actions, minimum permissions, one-day artifact
retention and main-only publication; neither push nor PR triggers deployment.
The workflow name remains Synthetic Pages prototype for continuity, but its input
now explicitly selects either synthetic or interface-only output.

Proposed actions require approval: commit only this proposal's seven files to main,
verify remote commit, then separately dispatch that exact workflow revision with
publication=interface-only, confirm_interface_publication=true and
confirm_synthetic_publication=false. Until successful manual publication the current
synthetic site remains live. The output would replace it at
https://aafadar-git.github.io/hercules-player-pages/; this is a live publication,
not a private draft. No settings/secrets/Netlify changes or real assets are involved.
