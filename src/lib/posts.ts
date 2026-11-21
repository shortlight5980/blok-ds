import { getCollection, type CollectionEntry } from 'astro:content';

type Post = CollectionEntry<'posts'>;

/** 按日期倒序返回文章；草稿只在本地开发时可见。 */
export async function getPosts(): Promise<Post[]> {
  const includeDrafts = import.meta.env.DEV;
  const posts = await getCollection('posts', ({ data }) => includeDrafts || !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
