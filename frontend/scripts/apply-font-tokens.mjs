// scripts/apply-font-tokens.mjs
//
// 2026-08-15 — 글꼴 토큰 일괄 적용 코드모드.
//
// 하는 일 세 가지:
//  A) `fontWeight: '600'` → `...weightFamily('semibold')` 치환
//     (굵기별 폰트 파일 위에 fontWeight를 얹으면 안드로이드가 합성 볼드를 겹쳐 얹습니다)
//  B) `fontSize: 18` → `fontSize: adjustFontSize(18)` 래핑
//     (글꼴별 크기 보정 — 나눔스퀘어네오 -1pt)
//  C) `fontSize:`가 있는데 글꼴 지정이 하나도 없는 스타일 객체에
//     `...weightFamily('regular')` 삽입
//     (fontFamily를 명시하지 않은 Text/TextInput은 OS 기본 글꼴로 남습니다)
//
// 실행:
//   node scripts/apply-font-tokens.mjs --dry   # 바뀔 파일만 출력, 쓰지 않음
//   node scripts/apply-font-tokens.mjs         # 실제 적용
//
// ⚠️ 반드시 커밋이 깨끗한 상태에서 돌리고 `git diff`로 검토하세요.
// ⚠️ src/theme/** 는 대상에서 제외합니다(토큰 정의 자체라 건드리면 안 됨).
// ⚠️ pinDisplayFont가 들어 있는 스타일 객체는 B·C 모두 건너뜁니다
//    (주아체처럼 사용자 글꼴과 무관하게 고정한 자리).
// ⚠️ 차트 파일(RadarChart/TrendGraph/SkinDiamondChart)은 react-native-svg의 Text라
//    렌더 결과를 눈으로 한 번 더 확인해주세요.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'src';
const DRY = process.argv.includes('--dry');

const WEIGHT_MAP = {
  100: 'regular',
  200: 'regular',
  300: 'regular',
  400: 'regular',
  500: 'medium',
  600: 'semibold',
  700: 'bold',
  800: 'bold',
  900: 'bold',
};

/** 이미 글꼴이 지정된 스타일 객체로 볼 표식들 */
const HAS_FONT = /weightFamily\(|pinFont\(|pinDisplayFont\(|fontFamily\s*:|\.\.\.typography\./;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === 'node_modules') continue;
      walk(p, out);
    } else if (/\.tsx?$/.test(p)) {
      out.push(p);
    }
  }
  return out;
}

function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

/** A) fontWeight: 'NNN' → ...weightFamily('key') */
function replaceFontWeight(lines) {
  let changed = false;
  const out = lines.map((line) => {
    if (isCommentLine(line)) return line;
    const m = line.match(/fontWeight:\s*'(\d{3})'(,?)/);
    if (!m) return line;
    const key = WEIGHT_MAP[Number(m[1])];
    if (!key) return line;
    changed = true;
    return line.replace(/fontWeight:\s*'\d{3}'(,?)/, `...weightFamily('${key}')$1`);
  });
  return { lines: out, changed };
}

/**
 * B + C) fontSize가 있는 스타일 객체를 훑습니다.
 * 중괄호를 세어 fontSize를 감싸는 가장 가까운 객체의 범위를 찾습니다.
 */
function processStyleObjects(text) {
  let changed = false;
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (isCommentLine(lines[i])) continue;
    if (!/fontSize:\s*\S/.test(lines[i])) continue;

    // 감싸는 객체의 시작 위치를 뒤로 훑어 찾습니다.
    let depth = 0;
    let start = -1;
    for (let j = i; j >= 0; j--) {
      const l = lines[j];
      for (let k = l.length - 1; k >= 0; k--) {
        if (l[k] === '}') depth++;
        else if (l[k] === '{') {
          if (depth === 0) {
            start = j;
            break;
          }
          depth--;
        }
      }
      if (start !== -1) break;
    }
    if (start === -1) continue;

    // 객체의 끝 위치를 앞으로 훑어 찾습니다.
    depth = 0;
    let end = -1;
    for (let j = start; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            end = j;
            break;
          }
        }
      }
      if (end !== -1) break;
    }
    if (end === -1) continue;

    const objectText = lines.slice(start, end + 1).join('\n');
    // 고정 글꼴 자리는 크기 보정도 글꼴 주입도 하지 않습니다.
    if (/pinDisplayFont\(/.test(objectText)) continue;

    // B) 숫자 리터럴만 래핑합니다. s(20)·변수·이미 래핑된 것은 건드리지 않습니다.
    const wrapped = lines[i].replace(
      /fontSize:\s*(\d+)(?![\d\w.(])/,
      (full, n) => `fontSize: adjustFontSize(${n})`,
    );
    if (wrapped !== lines[i]) {
      lines[i] = wrapped;
      changed = true;
    }

    // C) 글꼴 지정이 전혀 없으면 regular를 넣습니다.
    if (!HAS_FONT.test(objectText)) {
      const indent = lines[i].match(/^\s*/)[0];
      if (lines[i].trim().startsWith('fontSize:')) {
        lines.splice(i + 1, 0, `${indent}...weightFamily('regular'),`);
        i++;
      } else {
        lines[i] = lines[i].replace(
          /(fontSize:\s*(?:adjustFontSize\(\d+\)|[^,}]+))/,
          `$1, ...weightFamily('regular')`,
        );
      }
      changed = true;
    }
  }

  return { text: lines.join('\n'), changed };
}

/** 쓰이는데 import되지 않은 헬퍼를 마지막 import 줄 뒤에 추가 */
function ensureImports(text) {
  const needed = ['weightFamily', 'adjustFontSize'].filter((name) => {
    if (!new RegExp(`\\b${name}\\(`).test(text)) return false;
    return !new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`).test(text);
  });
  if (needed.length === 0) return text;

  const lines = text.split('\n');
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) lastImport = i;
    if (lastImport !== -1 && /^\}\s*from\s/.test(lines[i])) lastImport = i;
  }
  if (lastImport === -1) return text;

  lines.splice(lastImport + 1, 0, `import { ${needed.sort().join(', ')} } from '@/theme/typography';`);
  return lines.join('\n');
}

const files = walk(ROOT).filter((p) => !p.replace(/\\/g, '/').startsWith('src/theme/'));
const touched = [];

for (const file of files) {
  const original = readFileSync(file, 'utf8');

  const a = replaceFontWeight(original.split('\n'));
  const b = processStyleObjects(a.lines.join('\n'));
  if (!a.changed && !b.changed) continue;

  const result = ensureImports(b.text);
  touched.push(relative(process.cwd(), file));
  if (!DRY) writeFileSync(file, result, 'utf8');
}

console.log(`${DRY ? '[dry-run] 바뀔 파일' : '수정한 파일'}: ${touched.length}개`);
for (const f of touched) console.log('  ' + f);
if (DRY) console.log('\n실제 적용하려면 --dry 없이 다시 실행하세요.');
else console.log('\n다음: npx tsc --noEmit && npx eslint src, 그리고 git diff 검토');
