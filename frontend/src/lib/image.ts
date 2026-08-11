import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';

const MAX_LONG_SIDE = 1280;
const JPEG_COMPRESS = 0.7;

/**
 * S-16에서 촬영한 얼굴 사진을 업로드 전 상태로 가공합니다 — 좌우반전 보정 + 리사이즈 +
 * 압축을 한 번의 호출로 처리합니다.
 *
 * ⚠️ 신형 컨텍스트 API 대신 오래된 `manipulateAsync` 함수형 API를 씁니다. SDK가
 * 최신이라 신형 API가 설치된 Expo Go 클라이언트 버전에서 아직 완전히 지원되지
 * 않을 가능성이 있고(웹에서는 되는데 네이티브에서만 "Something went wrong"으로
 * 죽는 증상과 맞아떨어졌습니다), 이 함수형 API는 수년간 검증된 훨씬 안전한 경로입니다.
 *
 * - 좌우반전: expo-camera 전면 카메라 촬영본이 이 프로젝트 환경에서 기본적으로
 *   좌우반전된 상태로 저장되는 문제 보정(실기기 검증 확인, 2026-08-09). CameraView의
 *   mirror prop은 일부 기종에서 프리뷰 자체를 깨뜨리는 회귀가 있어(expo/expo#41433)
 *   쓰지 않고, 촬영 후 여기서 처리합니다.
 * - 리사이즈: 긴 변 기준 {@link MAX_LONG_SIDE}px로 축소합니다. 원본이 더 작으면
 *   확대하지 않습니다. width/height가 비정상(0·NaN·undefined)이면 리사이즈 자체를
 *   건너뜁니다 — 네이티브 리사이즈 함수에 NaN을 넘기면 크래시로 이어질 수 있어서,
 *   업로드 용량이 조금 커지는 쪽이 훨씬 안전합니다.
 * - 압축: JPEG {@link JPEG_COMPRESS} 품질로 저장합니다.
 *
 * ⚠️ actions 배열에 별도 타입을 선언하지 않고 각 분기의 호출부에서 배열 리터럴을 직접
 * 씁니다 — manipulateAsync의 Action 타입이 "flip 액션 아니면 resize 액션" 식의
 * discriminated union이라, {flip?, resize?} 처럼 둘 다 optional인 공용 타입을 만들면
 * 타입이 안 맞습니다(둘 중 하나는 항상 필수인 형태를 기대함). 배열 리터럴을 그 자리에서
 * 쓰면 TypeScript가 문맥으로 각 원소를 올바른 variant에 맞춰 추론합니다.
 *
 * @param uri 원본 촬영 파일 URI
 * @param originalSize takePictureAsync 결과의 width/height (종횡비 유지용)
 */
export async function prepareSkinPhoto(
  uri: string,
  originalSize: { width: number; height: number },
): Promise<{ uri: string }> {
  const hasValidSize =
    Number.isFinite(originalSize.width) &&
    Number.isFinite(originalSize.height) &&
    originalSize.width > 0 &&
    originalSize.height > 0;

  if (!hasValidSize && __DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      '[prepareSkinPhoto] 촬영 결과에 width/height가 없어 리사이즈를 건너뜁니다.',
      originalSize,
    );
  }

  const result = hasValidSize
    ? await manipulateAsync(
        uri,
        [{ flip: FlipType.Horizontal }, { resize: computeResize(originalSize) }],
        { compress: JPEG_COMPRESS, format: SaveFormat.JPEG },
      )
    : await manipulateAsync(uri, [{ flip: FlipType.Horizontal }], {
        compress: JPEG_COMPRESS,
        format: SaveFormat.JPEG,
      });

  return { uri: result.uri };
}

function computeResize(originalSize: { width: number; height: number }) {
  const longestSide = Math.max(originalSize.width, originalSize.height);
  const scale = longestSide > MAX_LONG_SIDE ? MAX_LONG_SIDE / longestSide : 1;
  return {
    width: Math.round(originalSize.width * scale),
    height: Math.round(originalSize.height * scale),
  };
}

/**
 * S-13에서 촬영한 바코드/제품 사진을 업로드 전 상태로 가공합니다 — 리사이즈 + 압축만
 * 합니다. prepareSkinPhoto와 달리 좌우반전 보정이 없습니다: 후면 카메라(facing='back')로
 * 찍기 때문에 셀피 좌우반전 이슈(위 prepareSkinPhoto 설명 참고)가 아예 발생하지 않습니다.
 *
 * @param uri 원본 촬영 파일 URI
 * @param originalSize takePictureAsync 결과의 width/height (종횡비 유지용)
 */
export async function prepareProductPhoto(
  uri: string,
  originalSize: { width: number; height: number },
): Promise<{ uri: string }> {
  const hasValidSize =
    Number.isFinite(originalSize.width) &&
    Number.isFinite(originalSize.height) &&
    originalSize.width > 0 &&
    originalSize.height > 0;

  if (!hasValidSize && __DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      '[prepareProductPhoto] 촬영 결과에 width/height가 없어 리사이즈를 건너뜁니다.',
      originalSize,
    );
  }

  const result = hasValidSize
    ? await manipulateAsync(uri, [{ resize: computeResize(originalSize) }], {
        compress: JPEG_COMPRESS,
        format: SaveFormat.JPEG,
      })
    : await manipulateAsync(uri, [], { compress: JPEG_COMPRESS, format: SaveFormat.JPEG });

  return { uri: result.uri };
}
