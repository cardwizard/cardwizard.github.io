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
if (editions.length) routes.push(`/newspaper/${editions.at(-1)}/`);
const screenshotRoutes = new Set(['/', '/blog/', '/projects/', '/publications/', '/newspaper/']);
const report = {baseline: [], current: [], regressions: [], externalRequestsBlocked: true};
const servers = [];
let browser;

async function inspect(origin, label, route, width) {
  const page = await browser.newPage({viewport: {width, height: 900}, reducedMotion: 'reduce'});
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
      newspaperNavigation: !!document.querySelector('nav[aria-label="Primary"] a[href="/newspaper/"]')
    }));
    const result = {route, width, status: response.status(), ...state, jsErrors, failedResources, brokenImages};
    if (screenshotRoutes.has(route)) {
      const name = route.replace(/\//g, '-').replace(/^-|-$/g, '') || 'home';
      await page.screenshot({path: join(reportDir, `${label}-${name}-${width}.jpg`), type: 'jpeg', quality: 78, fullPage: true});
    }
    if (label === 'current' && route === '/' && width === 390 && state.newspaperNavigation) {
      await page.getByRole('navigation', {name: 'Primary'}).getByRole('link', {name: 'Newspaper', exact: true}).click();
      await page.waitForURL(`${origin}/newspaper/`);
      if (!(await page.getByRole('heading', {name: 'Newspaper', exact: true}).isVisible())) {
        result.jsErrors.push('Newspaper navigation did not show its heading.');
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
    if (!current.newspaperNavigation) report.regressions.push(`${prefix}: Newspaper is missing from the custom navigation.`);
    for (const link of baseline.navigation) {
      if (!current.navigation.includes(link)) report.regressions.push(`${prefix}: removed existing navigation link ${link}`);
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
