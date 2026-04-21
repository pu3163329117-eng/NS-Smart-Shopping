import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const TEXT_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.vue',
  '.json',
  '.yml',
  '.yaml',
  '.md',
  '.css',
  '.scss',
  '.html',
  '.env',
  '.example',
  '.prisma',
  '.sql',
  '.ts',
  '.tsx',
]);

const TARGET_ROOTS = ['server', 'src', 'scripts'];

const issues = [];

const shouldCheckFile = (filePath) => {
  const normalized = filePath.replace(/\\/g, '/');

  if (normalized.startsWith('server/uploads/')) return false;
  if (normalized.startsWith('dist/')) return false;

  const ext = path.extname(normalized).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;

  const basename = path.basename(normalized).toLowerCase();
  return basename.includes('.env');
};

const toLineCol = (source, index) => {
  let line = 1;
  let col = 1;

  for (let i = 0; i < index; i += 1) {
    if (source[i] === '\n') {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
  }

  return { line, col };
};

const pushIssue = (file, type, message, source = '', index = 0) => {
  const loc = source ? toLineCol(source, index) : { line: 1, col: 1 };
  issues.push({
    file,
    type,
    message,
    line: loc.line,
    col: loc.col,
  });
};

const gitList = execSync(`git ls-files ${TARGET_ROOTS.join(' ')}`, {
  encoding: 'utf8',
})
  .split(/\r?\n/)
  .map((item) => item.trim())
  .filter(Boolean)
  .filter(shouldCheckFile);

for (const file of gitList) {
  const fullPath = path.resolve(file);
  const buffer = fs.readFileSync(fullPath);

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    pushIssue(file, 'BOM', 'UTF-8 BOM detected');
  }

  const content = buffer.toString('utf8');

  const replacementIndex = content.indexOf('\uFFFD');
  if (replacementIndex !== -1) {
    pushIssue(file, 'UTF8', 'Invalid UTF-8 sequence (replacement character found)', content, replacementIndex);
  }

  const controlMatch = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.exec(content);
  if (controlMatch) {
    pushIssue(
      file,
      'CTRL',
      `Unexpected control character (U+${controlMatch[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`,
      content,
      controlMatch.index
    );
  }

  const puaMatch = /[\uE000-\uF8FF]/.exec(content);
  if (puaMatch) {
    pushIssue(file, 'PUA', 'Private-use unicode character found (potential mojibake)', content, puaMatch.index);
  }
}

if (issues.length) {
  console.error('[encoding-health] FAILED');
  for (const issue of issues) {
    console.error(
      `- ${issue.file}:${issue.line}:${issue.col} [${issue.type}] ${issue.message}`
    );
  }
  process.exit(1);
}

console.log('[encoding-health] PASS');
