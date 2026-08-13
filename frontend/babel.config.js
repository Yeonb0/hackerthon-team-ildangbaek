module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
          },
          extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
        },
      ],
      // Phase 11-B — Development Build 전환(react-native-reanimated v4 도입, 관리자 결정
      // 2026-08-13). reanimated v4는 worklets가 react-native-worklets로 분리되어 이 플러그인을
      // 씁니다('react-native-reanimated/plugin'이 아님). 반드시 plugins 배열의 마지막이어야 합니다.
      'react-native-worklets/plugin',
    ],
  };
};
