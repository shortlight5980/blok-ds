import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import {
  HomepageCssCheckFailure,
  checkLocalHomepageCss,
  checkRemoteHomepageCss,
} from './check-homepage-css.mjs';

const homepageUrl = 'https://example.test/blok-ds/';
const stylesheetHref = '/blok-ds/_astro/main.css?v=1&amp;theme=light#critical';
const stylesheetUrl = 'https://example.test/blok-ds/_astro/main.css?v=1&theme=light';
const stylesheetContent = 'body { color: rebeccapurple; }\n';
const currentHomepage = `<!doctype html>
<html><head>
  <link rel="preload" as="style" href="/blok-ds/preload.css">
  <!-- <link rel="stylesheet" href="/blok-ds/comment.css"> -->
  <script>const text = '<link rel="stylesheet" href="/blok-ds/script.css">';</script>
  <template><link rel="stylesheet" href="/blok-ds/template.css"></template>
  <link REL="alternate STYLESHEET" href="${stylesheetHref}">
</head><body>current</body></html>`;
const oldHomepage = currentHomepage.replace('current', 'old');

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createPublishedRoot(homepage = currentHomepage) {
  const root = await mkdtemp(join(tmpdir(), 'homepage-css-check-'));
  temporaryDirectories.push(root);
  await mkdir(join(root, '_astro'));
  await writeFile(join(root, 'index.html'), homepage);
  await writeFile(join(root, '_astro', 'main.css'), stylesheetContent);
  return root;
}

function response(body, status = 200, headers = {}) {
  return new Response(body, { status, headers });
}

function logger() {
  const messages = [];
  return {
    messages,
    log(message) {
      messages.push(message);
    },
    warn(message) {
      messages.push(message);
    },
  };
}

describe('local homepage CSS validation', () => {
  it('resolves generated stylesheet links and ignores inert markup', async () => {
    const root = await createPublishedRoot();
    const result = await checkLocalHomepageCss({
      rootDir: root,
      basePath: '/blok-ds',
      origin: 'https://example.test',
    });

    assert.equal(result.stylesheets.size, 1);
    assert.equal(result.stylesheets.get(stylesheetUrl).content.toString(), stylesheetContent);
  });

  it('reports the referenced URL when its file is missing', async () => {
    const root = await createPublishedRoot();
    await rm(join(root, '_astro', 'main.css'));

    await assert.rejects(
      checkLocalHomepageCss({ rootDir: root, basePath: '/blok-ds', origin: 'https://example.test' }),
      (error) => error instanceof HomepageCssCheckFailure
        && error.message.includes(stylesheetUrl)
        && error.message.includes('is missing'),
    );
  });

  it('rejects a stylesheet outside the project base path', async () => {
    const root = await createPublishedRoot(currentHomepage.replace(stylesheetHref, '/blok-ds-other/main.css'));

    await assert.rejects(
      checkLocalHomepageCss({ rootDir: root, basePath: '/blok-ds', origin: 'https://example.test' }),
      (error) => error instanceof HomepageCssCheckFailure
        && error.message.includes('/blok-ds-other/main.css')
        && error.message.includes('outside'),
    );
  });

  it('rejects encoded path separators', async () => {
    const root = await createPublishedRoot(currentHomepage.replace(stylesheetHref, '/blok-ds/_astro/%2Fmain.css'));

    await assert.rejects(
      checkLocalHomepageCss({ rootDir: root, basePath: '/blok-ds', origin: 'https://example.test' }),
      (error) => error instanceof HomepageCssCheckFailure
        && error.message.includes('encoded path separator'),
    );
  });
});

describe('public homepage CSS validation', () => {
  it('retries a failed CSS response and passes a complete later attempt', async () => {
    const root = await createPublishedRoot();
    const calls = [];
    let cssAttempt = 0;
    const logs = logger();
    const result = await checkRemoteHomepageCss({
      url: homepageUrl,
      rootDir: root,
      basePath: '/blok-ds',
      attempts: 2,
      delayMs: 0,
      maxDurationMs: 10000,
      cacheBust: 'release',
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        if (new URL(url).pathname === '/blok-ds/') {
          return response(currentHomepage, 200, { 'content-type': 'text/html; charset=utf-8' });
        }
        cssAttempt += 1;
        return cssAttempt === 1
          ? response('not found', 404, { 'content-type': 'text/html' })
          : response(stylesheetContent, 200, { 'content-type': 'text/css; charset=utf-8' });
      },
      logger: logs,
    });

    assert.equal(result.attempt, 2);
    assert.equal(calls.length, 4);
    assert.equal(new URL(calls[0].url).searchParams.get('pages_check'), 'release-1');
    assert.equal(new URL(calls[1].url).searchParams.get('pages_check'), 'release-1');
    assert.equal(new URL(calls[1].url).hash, '');
    assert.equal(new URL(calls[1].url).pathname, '/blok-ds/_astro/main.css');
    assert.equal(calls[1].options.redirect, 'manual');
    assert.equal(calls[1].options.cache, 'no-store');
  });

  it('does not accept an older homepage that happens to have healthy CSS', async () => {
    const root = await createPublishedRoot();
    let homepageAttempt = 0;
    const logs = logger();
    const result = await checkRemoteHomepageCss({
      url: homepageUrl,
      rootDir: root,
      basePath: '/blok-ds',
      attempts: 2,
      delayMs: 0,
      maxDurationMs: 10000,
      fetchImpl: async (url) => {
        if (url === homepageUrl) {
          homepageAttempt += 1;
          return response(homepageAttempt === 1 ? oldHomepage : currentHomepage, 200, {
            'content-type': 'text/html',
          });
        }
        return response(stylesheetContent, 200, { 'content-type': 'text/css' });
      },
      logger: logs,
    });

    assert.equal(result.attempt, 2);
    assert.equal(homepageAttempt, 2);
  });

  it('reports a CSS MIME mismatch after retries are exhausted', async () => {
    const root = await createPublishedRoot();
    const logs = logger();

    await assert.rejects(
      checkRemoteHomepageCss({
        url: homepageUrl,
        rootDir: root,
        basePath: '/blok-ds',
        attempts: 2,
        delayMs: 0,
        maxDurationMs: 10000,
        fetchImpl: async (url) => url === homepageUrl
          ? response(currentHomepage, 200, { 'content-type': 'text/html' })
          : response('<html>not css</html>', 200, { 'content-type': 'text/html' }),
        logger: logs,
      }),
      (error) => error instanceof HomepageCssCheckFailure
        && error.message.includes(stylesheetUrl)
        && error.message.includes('HTTP 200')
        && error.message.includes('text/html'),
    );
    assert.ok(logs.messages.some((message) => message.includes('attempt 2/2')));
  });
});
