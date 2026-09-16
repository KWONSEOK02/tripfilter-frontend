#!/usr/bin/env node
// 디자인 토큰 게이트 — 정본은 Figma 파일 tripfilter 이고 코드 쪽 단일 선언 지점은 globals.css 의 :root 임.
// 그 밖에서 색과 타이포 값을 직접 쓰면 Figma 와 드리프트가 나고 감지 수단이 없으므로 여기서 막음.
// 의존성 0개. 실패 시 종료코드 1 과 위반 줄 번호를 출력함.
// 사용: node scripts/check-hardcoded.mjs

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CSS = join(ROOT, "src/app/globals.css");
const SRC = join(ROOT, "src");

const violations = [];
let checked = 0;

// 주석을 공백으로 치환함. 줄 번호를 유지해야 하므로 줄바꿈은 남김.
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

// 첫 `:root {` 의 대응 닫는 중괄호까지를 토큰 선언부로 봄.
function rootRange(text) {
  const start = text.indexOf(":root");
  if (start < 0) return [-1, -1];
  const open = text.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return [start, i];
    }
  }
  return [start, text.length];
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function scanCss() {
  const raw = readFileSync(CSS, "utf8");
  const text = stripComments(raw);
  const [rootStart, rootEnd] = rootRange(text);
  const outside = (i) => i < rootStart || i > rootEnd;
  const rel = relative(ROOT, CSS).replace(/\\/g, "/");

  // 검사 1 — :root 밖 색 리터럴
  const color = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/g;
  for (let m; (m = color.exec(text)); ) {
    checked++;
    if (outside(m.index)) violations.push(`${rel}:${lineOf(text, m.index)}  :root 밖 색 리터럴 ${m[0].trim()}`);
  }

  // 검사 3 — :root 밖 타이포 값. var() 참조만 허용함.
  const typo = /\b(font-size|line-height|font-weight)\s*:\s*([^;}]+)/g;
  for (let m; (m = typo.exec(text)); ) {
    checked++;
    if (outside(m.index) && !m[2].includes("var(")) {
      violations.push(`${rel}:${lineOf(text, m.index)}  :root 밖 ${m[1]} 값 ${m[2].trim()}`);
    }
  }
}

function tsxFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

// 검사 2 — 인라인 style. 토큰을 우회하는 가장 흔한 경로임.
function scanTsx() {
  for (const file of tsxFiles(SRC)) {
    const text = readFileSync(file, "utf8");
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    checked++;
    const re = /style=\{\{/g;
    for (let m; (m = re.exec(text)); ) {
      violations.push(`${rel}:${lineOf(text, m.index)}  인라인 style 사용`);
    }
  }
}

scanCss();
scanTsx();

if (violations.length) {
  console.error(`하드코딩 검사 실패 — ${violations.length}건`);
  for (const v of violations) console.error(`  ${v}`);
  console.error("\n색과 타이포 값은 globals.css 의 :root 에 토큰으로 선언하고 var() 로 참조할 것.");
  process.exit(1);
}

console.log(`하드코딩 검사 통과 — 검사 ${checked}건, 위반 0건`);
