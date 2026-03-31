#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from __future__ import annotations

import json
import os
import random
import re
import string
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional


PROJECT_ROOT = Path(__file__).resolve().parent.parent
TEXT_DIR = PROJECT_ROOT / "text"
OUTPUT_FILE = PROJECT_ROOT / "src" / "storiesData.ts"


@dataclass
class StoryData:
  id: str
  title: str
  tags: str
  summary: str
  version: str
  language: str  # "CN" | "EN"
  fileName: str
  wordCount: int
  order: int


def _rand_id(n: int = 9) -> str:
  # 与旧脚本类似：短随机字符串
  alphabet = string.ascii_lowercase + string.digits
  return "".join(random.choice(alphabet) for _ in range(n))


def _infer_language(file_name: str) -> str:
  # 通过文件名包含中文字符粗略判断
  return "CN" if re.search(r"[\u4e00-\u9fa5]", file_name) else "EN"


def _count_word(content: str, language: str) -> int:
  c = content.strip()
  if language == "CN":
    return len(c)
  # EN：按空白切分
  return len([w for w in re.split(r"\s+", c) if w])


def _strip_line_comments(ts: str) -> str:
  # 移除 // 注释（简单实现：按行处理）
  lines: List[str] = []
  for line in ts.splitlines():
    if line.lstrip().startswith("//"):
      continue
    # 移除行内 //（不严格，但 storiesData.ts 里通常不会在字符串中出现 //）
    if "//" in line:
      line = line.split("//", 1)[0]
    lines.append(line)
  return "\n".join(lines)


def _extract_stories_array(ts_content: str) -> Optional[str]:
  """
  从 src/storiesData.ts 中提取 export const storiesData: StoryData[] = [ ... ];
  返回 JSON 数组文本（包含 [ ]）。
  """
  m = re.search(r"export\s+const\s+storiesData\s*:\s*StoryData\[\]\s*=\s*\[", ts_content)
  if not m:
    return None
  start = m.end() - 1  # 指向 '['

  # 从 start 开始做括号匹配，找到对应的 ']'
  depth = 0
  in_str = False
  esc = False
  for i in range(start, len(ts_content)):
    ch = ts_content[i]
    if in_str:
      if esc:
        esc = False
      elif ch == "\\":
        esc = True
      elif ch == '"':
        in_str = False
      continue
    else:
      if ch == '"':
        in_str = True
        continue
      if ch == "[":
        depth += 1
      elif ch == "]":
        depth -= 1
        if depth == 0:
          return ts_content[start : i + 1]
  return None


def load_existing_data() -> Dict[str, Dict[str, Any]]:
  if not OUTPUT_FILE.exists():
    return {}

  raw = OUTPUT_FILE.read_text("utf-8")
  raw = _strip_line_comments(raw)
  arr_text = _extract_stories_array(raw)
  if not arr_text:
    return {}

  # 尝试解析为 JSON
  try:
    parsed = json.loads(arr_text)
    if not isinstance(parsed, list):
      return {}
  except Exception:
    return {}

  existing: Dict[str, Dict[str, Any]] = {}
  for item in parsed:
    if not isinstance(item, dict):
      continue
    fn = item.get("fileName")
    if isinstance(fn, str) and fn:
      existing[fn] = item
  return existing


def generate_base_story(file_path: Path) -> StoryData:
  file_name = file_path.name
  content = file_path.read_text("utf-8").strip()

  language = _infer_language(file_name)
  title = file_name[:-3] if file_name.endswith(".md") else file_name
  word_count = _count_word(content, language)

  return StoryData(
    id=_rand_id(),
    title=title,
    tags="",
    summary="",
    version="none",
    language=language,
    fileName=file_name,
    wordCount=word_count,
    order=0,
  )


def main() -> None:
  if not TEXT_DIR.exists():
    raise SystemExit(f"找不到目录: {TEXT_DIR}")

  files = sorted([p for p in TEXT_DIR.iterdir() if p.is_file() and p.suffix.lower() == ".md"])
  existing = load_existing_data()

  # 计算现有 order 的最大值（按语言分开）
  max_order: Dict[str, int] = {"CN": 0, "EN": 0}
  for v in existing.values():
    lang = v.get("language")
    if lang in ("CN", "EN"):
      try:
        o = int(v.get("order") or 0)
      except Exception:
        o = 0
      if o > max_order[lang]:
        max_order[lang] = o

  results: List[Dict[str, Any]] = []
  new_cn: List[StoryData] = []
  new_en: List[StoryData] = []

  for p in files:
    base = generate_base_story(p)
    ex = existing.get(base.fileName)
    if ex:
      # 保留手动字段
      base.id = str(ex.get("id") or base.id)
      base.title = str(ex.get("title") or base.title)
      base.tags = str(ex.get("tags") or base.tags)
      base.summary = str(ex.get("summary") or base.summary)
      base.version = str(ex.get("version") or base.version)
      base.language = str(ex.get("language") or base.language)
      try:
        base.order = int(ex.get("order") or 0)
      except Exception:
        base.order = 0
      results.append(base.__dict__)
    else:
      # 新增文章：order 自动追加到当前语言最后
      if base.language == "CN":
        new_cn.append(base)
      else:
        new_en.append(base)

  # 给新文章分配 order（按语言分别追加）
  for story in new_cn:
    max_order["CN"] += 1
    story.order = max_order["CN"]
    results.append(story.__dict__)
  for story in new_en:
    max_order["EN"] += 1
    story.order = max_order["EN"]
    results.append(story.__dict__)

  # 生成时按语言 + order 降序排列（展示端会再分栏，这里保持可读性）
  def sort_key(item: Dict[str, Any]):
    lang = item.get("language")
    lang_rank = 0 if lang == "CN" else 1
    try:
      order = int(item.get("order") or 0)
    except Exception:
      order = 0
    return (lang_rank, -order)

  results.sort(key=sort_key)

  output_ts = (
    "// 此文件由 scripts/generateStoriesData.py 自动生成基础数据\n"
    "// 可以手动编辑 order、summary、title 等字段，脚本会保留这些手动编辑的内容\n\n"
    "export interface StoryData {\n"
    "  id: string;\n"
    "  title: string;\n"
    "  tags: string;\n"
    "  summary: string;\n"
    "  version: string;\n"
    "  language: string; // CN | EN\n"
    "  fileName: string;\n"
    "  wordCount: number;\n"
    "  order: number; // 顺序，越大越新（可以手动修改）\n"
    "}\n\n"
    f"export const storiesData: StoryData[] = {json.dumps(results, ensure_ascii=False, indent=2)};\n"
  )

  OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
  OUTPUT_FILE.write_text(output_ts, "utf-8")
  print(f"✅ 生成 {len(results)} 条 storiesData 到 {OUTPUT_FILE}")


if __name__ == "__main__":
  # 固定随机种子会导致每次新增 id 可预测，不符合预期；保持随机
  main()

