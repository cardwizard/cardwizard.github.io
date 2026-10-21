import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFile, stat, readdir, mkdir, writeFile, realpath} from 'node:fs/promises';
import {resolve, join, extname, sep} from 'node:path';
import {chromium} from 'playwright-core';

if (process.argv.length !== 5) throw new Error('Usage: node scripts/check-site.mjs <current-site> <baseline-site> <report-dir>');
const [currentRoot, baselineRoot, reportDir] = process.argv.slice(2).map(path => resolve(path));
await mkdir(reportDir, {recursive: true});
const mime = {'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.woff': 'font/woff', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.ico': 'image/x-icon'};

async function serve(directory) {
  const root = await realpath(directory);
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let file = resolve(root, `.${pathname}`);
      if (file !== root && !file.startsWith(`${root}${sep}`)) throw Object.assign(new Error('Outside site'), {code: 'ENOENT'});
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      file = await realpath(file);
      if (!file.startsWith(`${root}${sep}`)) throw Object.assign(new Error('Outside site'), {code: 'ENOENT'});
      response.writeHead(200, {'Content-Type': `${mime[extname(file)] ?? 'application/octet-stream'}; charset=utf-8`});
      response.end(await readFile(file));
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR', 'URIError'].includes(error.code ?? error.name)) console.error(error);
      response.writeHead(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 400);
      response.end('Resource unavailable');
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {server, origin: `http://127.0.0.1:${server.address().port}`};
}

const routes = ['/', '/blog/', '/projects/', '/publications/', '/news/', '/now/', '/research-paper-cuts/', '/blog/2026/causalarmor/', '/newspaper/'];
const editions = (await readdir(join(currentRoot, 'newspaper'), {withFileTypes: true}))
  .filter(entry => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)).map(entry => entry.name).sort();
if (editions.length) {
  routes.push(`/newspaper/${editions.at(-1)}/`);
  routes.push(`/newspaper/${editions.at(-1)}/edition.html`);
}
const screenshotRoutes = new Set(['/', '/blog/', '/projects/', '/publications/', '/newspaper/']);
const report = {baseline: [], current: [], regressions: [], externalRequestsBlocked: true};
const servers = [];
let browser;

async function inspect(origin, label, route, width) {
  const page = await browser.newPage({viewport: {width, height: 900}, reducedMotion: 'reduce', colorScheme: 'dark'});
  const jsErrors = [];
  const failedResources = [];
  page.on('pageerror', error => jsErrors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(origin) && response.status() >= 400) failedResources.push(`${new URL(response.url()).pathname}: ${response.status()}`);
  });
  await page.route('**/*', request => {
    const url = new URL(request.request().url());
    return url.origin === origin || ['data:', 'blob:'].includes(url.protocol) ? request.continue() : request.abort('blockedbyclient');
  });
  try {
    const response = await page.goto(`${origin}${route}`, {waitUntil: 'domcontentloaded'});
    await page.evaluate(() => document.fonts.ready);
    const brokenImages = await page.locator('img').evaluateAll(async (images, localOrigin) => {
      const results = await Promise.all(images.filter(image => image.src.startsWith(localOrigin)).map(async image => {
        image.loading = 'eager';
        try {
          await image.decode();
          return null;
        } catch {
          return new URL(image.src).pathname;
        }
      }));
      return results.filter(Boolean);
    }, origin);
    const state = await page.evaluate(() => ({
      title: document.title,
      heading: document.querySelector('main h1')?.textContent.trim() ?? '',
      mainTextLength: document.querySelector('main')?.textContent.trim().length ?? 0,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      navigation: [...document.querySelectorAll('nav[aria-label="Primary"] a')].map(link => link.getAttribute('href')),
      newspaperNavigation: !!document.querySelector('nav[aria-label="Primary"] a[href="/newspaper/"]'),
      plainNewspaper: !!document.querySelector('main.newspaper-stream'),
      newspaperControls: document.querySelectorAll('iframe,button,select,details,nav').length,
      duplicateWrapper: !!document.querySelector('.edition-head,.edition-dek,.edition-text,.edition-chrome'),
      background: getComputedStyle(document.body).backgroundColor,
      colorScheme: document.documentElement.dataset.theme,
      newspaperEditions: [...document.querySelectorAll('.edition')].map(edition => ({
        date: edition.dataset.editionDate,
        expectedStories: Number(edition.dataset.storyCount),
        visibleStories: [...edition.querySelectorAll('article')].filter(article => article.getClientRects().length > 0).length
      })),
      archiveAsOf: document.querySelector('main.newspaper-stream')?.dataset.archiveAsOf,
      archiveEmpty: !!document.querySelector('.archive-empty'),
      nestedScrollers: [...document.querySelectorAll('body *')].filter(element => ['auto', 'scroll'].includes(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 1).length
    }));
    const result = {route, width, status: response.status(), ...state, jsErrors, failedResources, brokenImages};
    if (screenshotRoutes.has(route)) {
      const name = route.replace(/\//g, '-').replace(/^-|-$/g, '') || 'home';
      await page.screenshot({path: join(reportDir, `${label}-${name}-${width}.jpg`), type: 'jpeg', quality: 78, fullPage: true});
    }
    if (label === 'current' && route === '/' && width === 390 && state.newspaperNavigation) {
      await page.getByRole('navigation', {name: 'Primary'}).getByRole('link', {name: 'Newspaper', exact: true}).click();
      await page.waitForURL(`${origin}/newspaper/`);
      if (!(await page.locator('main.newspaper-stream .newspaper-name').first().isVisible())) {
        result.jsErrors.push('Newspaper navigation did not open the newspaper directly.');
      }
    }
    return result;
  } finally {
    await page.close();
  }
}

try {
  browser = await chromium.launch(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {});
  for (const [label, root] of [['baseline', baselineRoot], ['current', currentRoot]]) {
    const running = await serve(root);
    servers.push(running.server);
    for (const route of routes) {
      for (const width of [1280, 390]) report[label].push(await inspect(running.origin, label, route, width));
    }
  }
  for (const current of report.current) {
    const baseline = report.baseline.find(row => row.route === current.route && row.width === current.width);
    const prefix = `${current.route} at ${current.width}px`;
    if (current.status !== 200) report.regressions.push(`${prefix}: HTTP ${current.status}`);
    if (!current.heading || current.mainTextLength < 40) report.regressions.push(`${prefix}: missing or empty main content.`);
    if (current.overflow && !baseline.overflow) report.regressions.push(`${prefix}: new horizontal overflow.`);
    if (current.route.startsWith('/newspaper/')) {
      if (!current.plainNewspaper) report.regressions.push(`${prefix}: plain newspaper content is missing.`);
      if (current.newspaperControls || current.duplicateWrapper || current.nestedScrollers) report.regressions.push(`${prefix}: controls, duplicate text, iframe or nested scrolling returned.`);
      if (current.background !== 'rgb(255, 255, 255)' || current.colorScheme !== 'light') report.regressions.push(`${prefix}: newspaper must remain light even with a dark OS preference.`);
      for (const edition of current.newspaperEditions) {
        if (!edition.expectedStories || edition.expectedStories !== edition.visibleStories) report.regressions.push(`${prefix}: missing or hidden stories in ${edition.date}`);
      }
      if (!current.newspaperEditions.length && !(current.route === '/newspaper/' && current.archiveEmpty)) report.regressions.push(`${prefix}: newspaper contains no editions.`);
      const datedRoute = current.route.match(/^\/newspaper\/(\d{4}-\d{2}-\d{2})\//);
      if (datedRoute && (current.newspaperEditions.length !== 1 || current.newspaperEditions[0].date !== datedRoute[1])) report.regressions.push(`${prefix}: dated URL shows the wrong edition.`);
      if (current.route === '/newspaper/') {
        const index = JSON.parse(await readFile('_data/newspaper_archive.json', 'utf8'));
        const expectedDates = index.editions.map(edition => edition.date).sort().reverse();
        const asOf = new Date(`${index.asOf}T00:00:00Z`);
        if (index.schemaVersion !== 1 || index.retainDays !== 30 || !Number.isFinite(asOf.valueOf()) || asOf.toISOString().slice(0, 10) !== index.asOf) {
          report.regressions.push(`${prefix}: invalid 30-day archive configuration.`);
        } else {
          asOf.setUTCDate(asOf.getUTCDate() - 29);
          const firstDate = asOf.toISOString().slice(0, 10);
          const builtDates = editions.filter(date => date >= firstDate && date <= index.asOf).sort().reverse();
          if (JSON.stringify(expectedDates) !== JSON.stringify(builtDates)) report.regressions.push(`${prefix}: archive index omits or adds a published edition in its active window.`);
        }
        if (JSON.stringify(current.newspaperEditions.map(edition => edition.date)) !== JSON.stringify(expectedDates)) report.regressions.push(`${prefix}: scrolling feed does not match the active archive.`);
        if (current.archiveAsOf !== index.asOf) report.regressions.push(`${prefix}: archive date is missing or inconsistent.`);
      }
    } else {
      if (!current.newspaperNavigation) report.regressions.push(`${prefix}: Newspaper is missing from the custom navigation.`);
      for (const link of baseline.navigation) {
        if (!current.navigation.includes(link)) report.regressions.push(`${prefix}: removed existing navigation link ${link}`);
      }
    }
    for (const error of current.jsErrors) if (!baseline.jsErrors.includes(error)) report.regressions.push(`${prefix}: new browser error: ${error}`);
    for (const resource of current.failedResources) if (!baseline.failedResources.includes(resource)) report.regressions.push(`${prefix}: new failed resource: ${resource}`);
    for (const image of current.brokenImages) if (!baseline.brokenImages.includes(image)) report.regressions.push(`${prefix}: new undecodable image: ${image}`);
  }
  await writeFile(join(reportDir, 'browser-results.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (report.regressions.length) throw new Error(report.regressions.join('\n'));
  console.log(`Browser checks passed for ${routes.length} routes at desktop/mobile widths. Review before/after images in ${reportDir}.`);
} finally {
  if (browser) await browser.close();
  await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
}
