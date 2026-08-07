// @ts-check
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    // Phase 1 규칙: 화면 파일에 하드코딩 색상(#RRGGBB) 금지.
    // theme/tokens.ts의 color 토큰만 사용합니다.
    files: ['src/screens/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: "Literal[value=/^#([0-9a-fA-F]{3}){1,2}$/]",
          message: '화면 파일에 색상을 직접 하드코딩하지 말고 theme/tokens.ts의 color를 사용해 주세요.',
        },
      ],
    },
  },
];
