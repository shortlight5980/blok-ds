// 站点可能部署在子路径（例如 GitHub Pages 项目站点 /blok-ds/），
// 所有站内链接统一从这里生成。BASE_URL 以 / 结尾。
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

/** 生成带 base path 的站内路径，例如 url('/posts/a/')。 */
export function url(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalized}` || '/';
}

/** 文章页路径。 */
export function postPath(id: string): string {
  return url(`/posts/${id}/`);
}

/** 以 UTC 格式化日期，避免构建机时区影响。 */
export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}
