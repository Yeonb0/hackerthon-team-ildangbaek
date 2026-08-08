// .env의 EXPO_PUBLIC_USE_MOCK 값을 읽어옵니다.
// true면 실제 서버를 호출하지 않고 mock/ 폴더의 고정 데이터를 그대로 반환합니다.
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';