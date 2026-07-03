/** 将 /n、字面量 \n 转为真实换行符；含 "://" 的 URL 片段跳过，避免路径里的 /n 被切断 */
export function normalizeNewlines(text: string): string {
  return text
    .split(/(\s+)/)
    .map((token) =>
      token.includes('://') ? token : token.replace(/\/n/g, '\n').replace(/\\n/g, '\n')
    )
    .join('');
}
