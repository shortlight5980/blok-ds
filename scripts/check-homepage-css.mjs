#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { MIMEType } from 'node:util';
import { fileURLToPath } from 'node:url';

const DEFAULT_ATTEMPTS = 20;
const DEFAULT_DELAY_MS = 15000;
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_DURATION_MS = 300000;
const DEFAULT_BASE_PATH = '/blok-ds/';
const RAW_TEXT_ELEMENTS = new Set(['pre', 'script', 'style', 'textarea', 'template']);
const ASCII_WHITESPACE = /[\t\n\f\r ]+/;

export class HomepageCssCheckFailure extends Error {
  constructor(errors) {
    super(errors.join('\n'));
    this.name = 'HomepageCssCheckFailure';
    this.errors = errors;
  }
}

export class HomepageCssCheckArgumentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'HomepageCssCheckArgumentError';
  }
}

export function normalizeBasePath(value = '/') {
  let basePath = value.trim() || '/';
  if (!basePath.startsWith('/')) {
    basePath = `/${basePath}`;
  }
  if (!basePath.endsWith('/')) {
    basePath += '/';
  }
  return basePath.replaceAll(/\/{2,}/g, '/');
}

function decodeHtmlEntities(value) {
  return value.replace(/&(#(?:x[\da-f]+|\d+)|amp|apos|gt|lt|quot);/gi, (entity, name) => {
    const lowerName = name.toLowerCase();
    if (lowerName === 'amp') return '&';
    if (lowerName === 'apos') return "'";
    if (lowerName === 'gt') return '>';
    if (lowerName === 'lt') return '<';
    if (lowerName === 'quot') return '"';
    const codePoint = lowerName.startsWith('x')
      ? Number.parseInt(lowerName.slice(1), 16)
      : Number.parseInt(lowerName, 10);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : entity;
  });
}

function findTagEnd(html, start) {
  let quote = null;
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (character === quote) {
        quote = null;
      }
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

function readTagName(html, start) {
  let index = start;
  while (index < html.length && /[A-Za-z0-9:-]/.test(html[index])) {
    index += 1;
  }
  return { name: html.slice(start, index).toLowerCase(), end: index };
}

function parseAttributes(tag, tagNameEnd) {
  const attributes = new Map();
  let index = tagNameEnd;

  while (index < tag.length - 1) {
    while (index < tag.length - 1 && /[\t\n\f\r />]/.test(tag[index])) {
      index += 1;
    }
    if (index >= tag.length - 1 || tag[index] === '>') {
      break;
    }

    const nameStart = index;
    while (index < tag.length - 1 && !/[\t\n\f\r />=]/.test(tag[index])) {
      index += 1;
    }
    const name = tag.slice(nameStart, index).toLowerCase();
    while (index < tag.length - 1 && /[\t\n\f\r ]/.test(tag[index])) {
      index += 1;
    }

    let value = '';
    if (tag[index] === '=') {
      index += 1;
      while (index < tag.length - 1 && /[\t\n\f\r ]/.test(tag[index])) {
        index += 1;
      }
      if (tag[index] === '"' || tag[index] === "'") {
        const quote = tag[index];
        index += 1;
        const valueStart = index;
        while (index < tag.length - 1 && tag[index] !== quote) {
          index += 1;
        }
        value = tag.slice(valueStart, index);
        if (index < tag.length - 1) {
          index += 1;
        }
      } else {
        const valueStart = index;
        while (index < tag.length - 1 && !/[\t\n\f\r >]/.test(tag[index])) {
          index += 1;
        }
        value = tag.slice(valueStart, index);
      }
    }

    if (name && !attributes.has(name)) {
      attributes.set(name, decodeHtmlEntities(value));
    }
  }

  return attributes;
}

function skipComment(html, start) {
  const end = html.indexOf('-->', start + 4);
  return end === -1 ? html.length : end + 3;
}

function skipRawText(html, start, tagName) {
  const closingTag = new RegExp(`<\\/\\s*${tagName}(?:\\s|>)`, 'i');
  const match = closingTag.exec(html.slice(start));
  return match ? start + match.index + match[0].length : html.length;
}

function scanHtmlTags(html) {
  const tags = [];
  let index = 0;

  while (index < html.length) {
    const open = html.indexOf('<', index);
    if (open === -1) {
      break;
    }
    if (html.startsWith('<!--', open)) {
      index = skipComment(html, open);
      continue;
    }
    if (html.startsWith('<![CDATA[', open)) {
      const end = html.indexOf(']]>', open + 9);
      index = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html[open + 1] === '!' || html[open + 1] === '?') {
      const end = findTagEnd(html, open + 2);
      index = end === -1 ? html.length : end + 1;
      continue;
    }
    if (html[open + 1] === '/') {
      index = open + 2;
      continue;
    }

    const { name, end: tagNameEnd } = readTagName(html, open + 1);
    if (!name) {
      index = open + 1;
      continue;
    }
    const end = findTagEnd(html, tagNameEnd);
    if (end === -1) {
      break;
    }
    const tag = html.slice(open, end + 1);
    const attributes = parseAttributes(tag, tagNameEnd - open);
    tags.push({ name, attributes });
    index = end + 1;

    if (RAW_TEXT_ELEMENTS.has(name) && !/\/\s*>$/.test(tag)) {
      index = skipRawText(html, index, name);
    }
  }

  return tags;
}

function parseHomepage(html, pageUrl) {
  const tags = scanHtmlTags(html);
  const baseTag = tags.find((tag) => tag.name === 'base' && tag.attributes.has('href'));
  let resolutionBase = pageUrl;
  if (baseTag) {
    try {
      resolutionBase = new URL(baseTag.attributes.get('href'), pageUrl);
    } catch {
      resolutionBase = pageUrl;
    }
  }

  const stylesheetHrefs = tags
    .filter((tag) => tag.name === 'link')
    .filter((tag) => {
      const rel = tag.attributes.get('rel');
      return rel && rel.split(ASCII_WHITESPACE).some((token) => token.toLowerCase() === 'stylesheet');
    })
    .map((tag) => tag.attributes.get('href') ?? '');

  return { stylesheetHrefs, resolutionBase };
}

function ensurePageUrl(value) {
  let pageUrl;
  try {
    pageUrl = value instanceof URL ? new URL(value.href) : new URL(value);
  } catch {
    throw new HomepageCssCheckArgumentError(`invalid homepage URL: ${String(value)}`);
  }
  if (pageUrl.protocol !== 'http:' && pageUrl.protocol !== 'https:') {
    throw new HomepageCssCheckArgumentError(`homepage URL must use HTTP(S): ${pageUrl.href}`);
  }
  if (!pageUrl.pathname.endsWith('/')) {
    throw new HomepageCssCheckArgumentError(`homepage URL must end with /: ${pageUrl.href}`);
  }
  pageUrl.hash = '';
  return pageUrl;
}

function ensureInsideBasePath(pathname, basePath) {
  return pathname.startsWith(basePath) && pathname !== basePath;
}

function decodePathSegment(segment, url) {
  if (/%(?:2f|5c)/i.test(segment)) {
    throw new Error(`stylesheet URL ${url} contains an encoded path separator`);
  }
  let decoded;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    throw new Error(`stylesheet URL ${url} contains an invalid percent escape`);
  }
  if (decoded.includes('/') || decoded.includes('\\') || decoded.includes('\0')) {
    throw new Error(`stylesheet URL ${url} contains a decoded path separator or NUL`);
  }
  if (!decoded || decoded === '.' || decoded === '..') {
    throw new Error(`stylesheet URL ${url} contains an unsafe path segment`);
  }
  return decoded;
}

function pathForLocalUrl(url, rootDir, basePath) {
  const pathname = url.pathname;
  if (!ensureInsideBasePath(pathname, basePath)) {
    throw new Error(`stylesheet URL ${url.href} is outside the ${basePath} base path`);
  }

  const relativeUrlPath = pathname.slice(basePath.length);
  const rawSegments = relativeUrlPath.split('/');
  if (rawSegments.some((segment) => segment === '')) {
    throw new Error(`stylesheet URL ${url.href} contains an empty path segment`);
  }
  const relativeSegments = rawSegments.map((segment) => decodePathSegment(segment, url.href));
  const root = resolve(rootDir);
  const filePath = resolve(root, ...relativeSegments);
  const relativeFilePath = relative(root, filePath);
  if (!relativeFilePath || relativeFilePath.startsWith('..') || isAbsolute(relativeFilePath)) {
    throw new Error(`stylesheet URL ${url.href} escapes the published directory`);
  }
  return filePath;
}

function canonicalUrl(url) {
  const canonical = new URL(url.href);
  canonical.hash = '';
  return canonical.href;
}

function resolveStylesheetLinks(hrefs, { documentUrl, resolutionBase, basePath, rootDir }) {
  const local = [];
  const errors = [];

  for (const href of hrefs) {
    if (!href.trim()) {
      errors.push(`homepage ${documentUrl.href}: stylesheet link is missing an href`);
      continue;
    }

    let url;
    try {
      url = new URL(href, resolutionBase);
    } catch {
      errors.push(`homepage ${documentUrl.href}: stylesheet href ${JSON.stringify(href)} is not a valid URL`);
      continue;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      errors.push(`stylesheet URL ${url.href} is not an HTTP(S) resource`);
      continue;
    }
    if (url.origin !== documentUrl.origin) {
      errors.push(`stylesheet URL ${url.href} is external to ${documentUrl.origin}`);
      continue;
    }

    try {
      const filePath = rootDir ? pathForLocalUrl(url, rootDir, basePath) : undefined;
      local.push({ href, url, canonicalUrl: canonicalUrl(url), filePath });
    } catch (error) {
      errors.push(error.message);
    }
  }

  return { local, errors };
}

async function inspectExpectedHomepage({ rootDir, homepagePath, basePath, documentUrl }) {
  const resolvedHomepagePath = resolve(homepagePath ?? resolve(rootDir, 'index.html'));
  const html = await readFile(resolvedHomepagePath);
  const parsed = parseHomepage(html.toString('utf8'), documentUrl);
  const { local, errors } = resolveStylesheetLinks(parsed.stylesheetHrefs, {
    documentUrl,
    resolutionBase: parsed.resolutionBase,
    basePath,
    rootDir,
  });

  if (local.length === 0) {
    errors.push(`homepage ${documentUrl.href} does not reference a local stylesheet under ${basePath}`);
  }
  if (errors.length > 0) {
    throw new HomepageCssCheckFailure(errors);
  }

  const rootPath = resolve(rootDir);
  const rootRealPath = await realpath(rootPath);
  const stylesheets = new Map();
  const fileErrors = [];
  for (const stylesheet of local) {
    if (stylesheets.has(stylesheet.canonicalUrl)) {
      continue;
    }

    let fileStats;
    try {
      fileStats = await lstat(stylesheet.filePath);
    } catch {
      fileErrors.push(`stylesheet ${stylesheet.url.href} is missing at ${stylesheet.filePath}`);
      continue;
    }
    if (fileStats.isSymbolicLink()) {
      fileErrors.push(`stylesheet ${stylesheet.url.href} is a symbolic link at ${stylesheet.filePath}`);
      continue;
    }
    if (!fileStats.isFile()) {
      fileErrors.push(`stylesheet ${stylesheet.url.href} is not a regular file at ${stylesheet.filePath}`);
      continue;
    }

    let fileRealPath;
    try {
      fileRealPath = await realpath(stylesheet.filePath);
    } catch {
      fileErrors.push(`stylesheet ${stylesheet.url.href} cannot be resolved at ${stylesheet.filePath}`);
      continue;
    }
    const relativeRealPath = relative(rootRealPath, fileRealPath);
    if (!relativeRealPath || relativeRealPath.startsWith('..') || isAbsolute(relativeRealPath)) {
      fileErrors.push(`stylesheet ${stylesheet.url.href} resolves outside the published directory`);
      continue;
    }

    stylesheets.set(stylesheet.canonicalUrl, {
      ...stylesheet,
      content: await readFile(stylesheet.filePath),
    });
  }
  if (fileErrors.length > 0) {
    throw new HomepageCssCheckFailure(fileErrors);
  }

  return {
    html,
    htmlHash: sha256(html),
    local,
    stylesheets,
  };
}

export async function checkLocalHomepageCss({
  rootDir,
  homepagePath,
  basePath = DEFAULT_BASE_PATH,
  origin = 'https://pages-check.invalid',
}) {
  const normalizedBasePath = normalizeBasePath(basePath);
  const documentUrl = ensurePageUrl(new URL(normalizedBasePath, origin));
  return inspectExpectedHomepage({
    rootDir,
    homepagePath,
    basePath: normalizedBasePath,
    documentUrl,
  });
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function mediaType(response) {
  const rawContentType = response.headers.get('content-type');
  if (!rawContentType) {
    return null;
  }
  try {
    return new MIMEType(rawContentType).essence.toLowerCase();
  } catch {
    return null;
  }
}

function responseDescription(response) {
  const rawContentType = response.headers.get('content-type') ?? '(missing)';
  const location = response.headers.get('location');
  const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
  return `HTTP ${status}, Content-Type: ${rawContentType}${location ? `, Location: ${location}` : ''}`;
}

function requestError(url, error, timeoutMs) {
  if (error?.name === 'AbortError') {
    return `${url}: request timed out after ${timeoutMs} ms`;
  }
  return `${url}: request failed: ${error.message}`;
}

async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      signal: controller.signal,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch (error) {
    throw new Error(requestError(url, error, timeoutMs));
  } finally {
    clearTimeout(timeout);
  }
}

function requestUrl(url, cacheBust) {
  if (!cacheBust) {
    return url;
  }
  const parsed = new URL(url);
  parsed.searchParams.set('pages_check', cacheBust);
  return parsed.href;
}

function stylesheetSet(stylesheets) {
  return new Set(stylesheets.map((stylesheet) => stylesheet.canonicalUrl));
}

function describeSetDifference(expected, actual) {
  const missing = [...expected].filter((url) => !actual.has(url));
  const unexpected = [...actual].filter((url) => !expected.has(url));
  const details = [];
  if (missing.length > 0) {
    details.push(`missing ${missing.join(', ')}`);
  }
  if (unexpected.length > 0) {
    details.push(`unexpected ${unexpected.join(', ')}`);
  }
  return details.join('; ');
}

async function readResponseBody(response, url) {
  try {
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    throw new Error(`${url}: unable to read response body: ${error.message}`);
  }
}

async function checkRemoteAttempt({
  url,
  basePath,
  expected,
  fetchImpl,
  timeoutMs,
  cacheBust,
}) {
  const errors = [];
  const homeRequestUrl = requestUrl(url, cacheBust);
  let homepageResponse;
  try {
    homepageResponse = await fetchWithTimeout(fetchImpl, homeRequestUrl, timeoutMs);
  } catch (error) {
    return { errors: [error.message], stylesheets: [] };
  }

  const homepageBody = await readResponseBody(homepageResponse, url).catch((error) => ({ error }));
  if (homepageBody.error) {
    return { errors: [homepageBody.error.message], stylesheets: [] };
  }

  const page = ensurePageUrl(url);
  if (homepageResponse.status !== 200 || mediaType(homepageResponse) !== 'text/html') {
    errors.push(`${url}: ${responseDescription(homepageResponse)}`);
  }
  if (expected && !homepageBody.equals(expected.html)) {
    errors.push(`${url}: response body hash ${sha256(homepageBody)} does not match published homepage hash ${expected.htmlHash}`);
  }

  const parsed = parseHomepage(homepageBody.toString('utf8'), page);
  const { local, errors: linkErrors } = resolveStylesheetLinks(parsed.stylesheetHrefs, {
    documentUrl: page,
    resolutionBase: parsed.resolutionBase,
    basePath: normalizeBasePath(basePath),
  });
  errors.push(...linkErrors);
  if (local.length === 0) {
    errors.push(`homepage ${url} does not reference a local stylesheet under ${normalizeBasePath(basePath)}`);
  }

  if (expected) {
    const expectedUrls = stylesheetSet(expected.local);
    const actualUrls = stylesheetSet(local);
    const difference = describeSetDifference(expectedUrls, actualUrls);
    if (difference) {
      errors.push(`homepage stylesheet references differ from the published artifact: ${difference}`);
    }
  }

  for (const stylesheet of local) {
    let response;
    try {
      response = await fetchWithTimeout(fetchImpl, requestUrl(stylesheet.canonicalUrl, cacheBust), timeoutMs);
    } catch (error) {
      errors.push(error.message);
      continue;
    }

    const body = await readResponseBody(response, stylesheet.canonicalUrl).catch((error) => ({ error }));
    if (body.error) {
      errors.push(body.error.message);
      continue;
    }

    if (response.status !== 200 || mediaType(response) !== 'text/css') {
      errors.push(`${stylesheet.url.href}: ${responseDescription(response)}`);
      continue;
    }

    if (response.url && new URL(response.url).origin !== page.origin) {
      errors.push(`${stylesheet.url.href}: redirected to a different origin ${response.url}`);
      continue;
    }

    const expectedStylesheet = expected?.stylesheets.get(stylesheet.canonicalUrl);
    if (expectedStylesheet && !body.equals(expectedStylesheet.content)) {
      errors.push(`${stylesheet.url.href}: response body hash ${sha256(body)} does not match published CSS hash ${sha256(expectedStylesheet.content)}`);
    }
  }

  return { errors, stylesheets: local };
}

export async function checkRemoteHomepageCss({
  url,
  rootDir,
  homepagePath,
  basePath = DEFAULT_BASE_PATH,
  attempts = DEFAULT_ATTEMPTS,
  delayMs = DEFAULT_DELAY_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxDurationMs = DEFAULT_MAX_DURATION_MS,
  cacheBust,
  fetchImpl = globalThis.fetch,
  sleep = (duration) => new Promise((resolvePromise) => setTimeout(resolvePromise, duration)),
  logger = console,
}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('global fetch is unavailable');
  }

  const normalizedBasePath = normalizeBasePath(basePath);
  const pageUrl = ensurePageUrl(url);
  const expected = rootDir || homepagePath
    ? await inspectExpectedHomepage({
      rootDir,
      homepagePath,
      basePath: normalizedBasePath,
      documentUrl: pageUrl,
    })
    : undefined;
  const totalAttempts = Number(attempts);
  const waitMs = Number(delayMs);
  const requestTimeoutMs = Number(timeoutMs);
  const maxDuration = Number(maxDurationMs);
  if (!Number.isInteger(totalAttempts) || totalAttempts < 1 || totalAttempts > 20) {
    throw new HomepageCssCheckArgumentError('--attempts must be an integer between 1 and 20');
  }
  if (!Number.isFinite(waitMs) || waitMs < 0 || !Number.isFinite(requestTimeoutMs) || requestTimeoutMs < 1 || !Number.isFinite(maxDuration) || maxDuration < 1) {
    throw new HomepageCssCheckArgumentError('--delay-ms, --timeout-ms, and --max-duration-ms must be non-negative finite values');
  }

  const deadline = Date.now() + maxDuration;
  let lastErrors = ['no attempts were made'];
  let completedAttempts = 0;
  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    if (Date.now() >= deadline) {
      break;
    }
    completedAttempts = attempt;
    const result = await checkRemoteAttempt({
      url: pageUrl.href,
      basePath: normalizedBasePath,
      expected,
      fetchImpl,
      timeoutMs: requestTimeoutMs,
      cacheBust: cacheBust ? `${cacheBust}-${attempt}` : undefined,
    });
    if (result.errors.length === 0) {
      logger.log(`Homepage CSS post-publish check passed on attempt ${attempt}/${totalAttempts}.`);
      logger.log(`Homepage: ${pageUrl.href}`);
      logger.log(`Stylesheets: ${result.stylesheets.map((stylesheet) => stylesheet.canonicalUrl).join(', ')}`);
      return { attempt, expected, stylesheets: result.stylesheets };
    }

    lastErrors = result.errors;
    logger.warn(`Homepage CSS check attempt ${attempt}/${totalAttempts} failed.`);
    for (const error of lastErrors) {
      logger.warn(`  ${error}`);
    }
    if (attempt < totalAttempts && waitMs > 0) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        break;
      }
      await sleep(Math.min(waitMs, remaining));
    }
  }

  const durationMessage = completedAttempts >= totalAttempts
    ? `after ${totalAttempts} attempt(s)`
    : `after ${completedAttempts} attempt(s) and ${maxDuration} ms`;
  throw new HomepageCssCheckFailure([
    `homepage CSS check failed ${durationMessage}`,
    ...lastErrors,
  ]);
}

function valueAfter(args, index, option) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new HomepageCssCheckArgumentError(`${option} requires a value`);
  }
  return value;
}

function parseArgs(args) {
  const options = {
    basePath: DEFAULT_BASE_PATH,
    origin: 'https://pages-check.invalid',
    attempts: DEFAULT_ATTEMPTS,
    delayMs: DEFAULT_DELAY_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxDurationMs: DEFAULT_MAX_DURATION_MS,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    switch (argument) {
      case '--root':
        options.rootDir = valueAfter(args, index, argument);
        index += 1;
        break;
      case '--homepage':
      case '--expected-homepage':
        options.homepagePath = valueAfter(args, index, argument);
        index += 1;
        break;
      case '--url':
        options.url = valueAfter(args, index, argument);
        index += 1;
        break;
      case '--base-path':
        options.basePath = valueAfter(args, index, argument);
        index += 1;
        break;
      case '--origin':
        options.origin = valueAfter(args, index, argument);
        index += 1;
        break;
      case '--cache-bust':
        options.cacheBust = valueAfter(args, index, argument);
        index += 1;
        break;
      case '--attempts':
        options.attempts = Number(valueAfter(args, index, argument));
        index += 1;
        break;
      case '--delay-ms':
        options.delayMs = Number(valueAfter(args, index, argument));
        index += 1;
        break;
      case '--timeout-ms':
        options.timeoutMs = Number(valueAfter(args, index, argument));
        index += 1;
        break;
      case '--max-duration-ms':
        options.maxDurationMs = Number(valueAfter(args, index, argument));
        index += 1;
        break;
      case '--help':
        options.help = true;
        break;
      default:
        throw new HomepageCssCheckArgumentError(`unknown option ${argument}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/check-homepage-css.mjs --root <published-root> [--base-path /blok-ds/]
  node scripts/check-homepage-css.mjs --url <public-homepage-url> --root <published-root> [options]

Options:
  --homepage <path>       Homepage file used as the expected published artifact
  --origin <url>          Origin used for local pre-publish URLs
  --base-path <path>      Pages base path, default /blok-ds/
  --cache-bust <value>    Add a unique pages_check query to public requests
  --attempts <number>     Remote attempts, 1-20, default 20
  --delay-ms <number>     Delay between remote attempts, default 15000
  --timeout-ms <number>   Request timeout, default 5000
  --max-duration-ms <n>   Overall remote check limit, default 300000`);
}

async function runCli() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!options.rootDir) {
    throw new HomepageCssCheckArgumentError('--root is required');
  }

  if (options.url) {
    await checkRemoteHomepageCss(options);
    return;
  }

  const result = await checkLocalHomepageCss(options);
  console.log(`Homepage CSS pre-publish check passed. Found ${result.stylesheets.size} local stylesheet(s).`);
  for (const stylesheet of result.stylesheets.values()) {
    console.log(`  ${stylesheet.canonicalUrl}`);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  runCli().catch((error) => {
    console.error(`Homepage CSS check failed.\n${error.message}`);
    process.exitCode = error instanceof HomepageCssCheckArgumentError ? 2 : 1;
  });
}
