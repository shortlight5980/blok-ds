// @ts-check
/** @typedef {import('astro').APIContext} APIContext */

import rss from '@astrojs/rss';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';
import { getPosts } from '../lib/posts';
import { postPath, url } from '../lib/site';

/** @param {APIContext} context */
export async function GET(context) {
  const posts = await getPosts();

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: new URL(url('/'), context.site ?? 'http://localhost:4321'),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? '',
      pubDate: post.data.date,
      link: postPath(post.id),
    })),
    customData: '<language>zh-CN</language>',
  });
}
