// 站点访问口令校验：只存 SHA-256 摘要，不存明文
const SALT = 'hongcliff-garden-v1';

const PASSCODE_HASHES = [
  'f9059a8ca071725586c340e413fb739f7f975300d382b5bcb6aee22ac545cdaf',
  '72862f20fd6a43cb17915930f5c82ed98c58d111c0e83aaad651bc0dac7175a0',
];

// 会话内解锁：关闭标签页/浏览器后失效
export const UNLOCK_KEY = 'garden-unlocked';

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPasscode(input: string): Promise<boolean> {
  const code = input.trim();
  if (!/^\d{4}$/.test(code)) return false;
  const hash = await sha256Hex(SALT + code);
  return PASSCODE_HASHES.includes(hash);
}

export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function markUnlocked(): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    /* 隐私模式下写入失败时仅本次渲染有效 */
  }
}
