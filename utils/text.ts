/** 将 /n、字面量 \n 转为真实换行符 */
export function normalizeNewlines(text: string): string {
  return text.replace(/\/n/g, '\n').replace(/\\n/g, '\n');
}
