# Website review and deployment

## Branches and authority

- `source` contains editable Jekyll source. Every change goes through a PR.
- `cardwizard` is the only identity allowed to merge source changes.
- Muse must use a separate installation/bot identity without administration or
  bypass permissions. An agent authenticated as `cardwizard` is indistinguishable
  from the owner; commit author text does not change that identity.
- The `Website checks` result must pass before a PR can merge.
- Pull requests build and test, but never deploy.

## Deployment

GitHub Pages must use **GitHub Actions** as its publishing source. The
`github-pages` environment allows deployments from `source` only.
The workflow builds with Ruby 3.3 and the locked Gemfile, validates the output,
uploads the verified Pages artifact, and deploys after a merge into `source`.

Deployment uses Pages/OIDC permissions, not a write-enabled deploy key or an
owner PAT. The workflow never pushes generated files to `master` or `gh-pages`.
Keep the legacy branches protected; do not grant Muse or Actions a bypass to
push generated content there. Do not use the destructive legacy `bin/deploy`.

The owner may dispatch the workflow on `source` to retry a deployment of already
merged code. Dispatches on other branches cannot deploy.

## What blocks regressions

For every PR, CI builds the proposed merge and its base revision. It verifies:

- Existing generated HTML routes remain present.
- The main site sections and Newspaper route exist.
- No new broken internal page, anchor, image, stylesheet, script or iframe links.
- Desktop/mobile pages retain visible headings, content and existing navigation.
- The Newspaper link is actually present in the custom header and works.
- Newspaper routes open the light, continuous paper directly, without an iframe,
  duplicated blog introduction/text version, dark mode or reader controls.
- No newly introduced browser errors, failed local resources or horizontal overflow.

The workflow uploads before/after screenshots and JSON reports for human review.
Existing link warnings are reported separately, not silently counted as new
regressions. External URLs/CDNs are not validated by these deterministic checks;
check critical third-party integrations manually when changing them. Passing CI
reduces regression risk, but does not replace reviewing the preview.

## Local checks

```sh
bundle install
npm ci
npx playwright-core install chromium
JEKYLL_ENV=production bundle exec jekyll build --destination /tmp/site-current
# Build the PR base separately at /tmp/site-baseline, then:
bundle exec ruby scripts/check_site.rb /tmp/site-current /tmp/site-baseline site-report
npm run check:browser -- /tmp/site-current /tmp/site-baseline site-report
```

An existing Chrome can be used by setting `CHROME_PATH` for browser checks.
Never put credentials or private approval conversations into the site or reports.

## Newspaper publishing format

The production repository's newspaper build emits `body.html` and `styles.css`.
For an approved edition, copy the body into `_includes/newspaper/YYYY-MM-DD.html`
and use the shared `assets/css/newspaper.css`. The generated body escapes Liquid
delimiters in research text; do not replace it with unescaped external HTML.

Each `_newspapers/YYYY-MM-DD.md` record uses `layout: newspaper-edition`,
`edition_key: "YYYY-MM-DD"` and
`edition_include: newspaper/YYYY-MM-DD.html`. Its Markdown remains archival
source text, but the layout renders only the newspaper body, never a duplicate
"Text version" below it.

`/newspaper/` renders the active edition bodies newest first in one normal
document scroll. `_data/newspaper_catalog.json` retains all publication metadata;
generate `_data/newspaper_archive.json` with the production repository's
`npm run archive` command and an explicit agreed calendar date. Keep dated
permalinks and old text records even after an edition leaves the 30-day feed.
Plain HTML bodies are small text content, not large exports to expire.

Legacy `/newspaper/YYYY-MM-DD/edition.html` links use the same layout rather than
shipping another independent reader. There is no theme picker, pagination,
dark-mode script, site chrome, or separate scroll container on newspaper pages.
Browser printing still formats each dated edition as two A4 pages.
