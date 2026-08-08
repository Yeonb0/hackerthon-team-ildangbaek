package com.ildangbaek.backend.global.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * 이미지를 저장하고 조회용 URL을 돌려준다.
 *
 * <p>구현체를 교체할 수 있도록 인터페이스로 분리한다. 현재는 {@link LocalImageStorage} 하나뿐이고,
 * S3 등으로 전환할 때 구현체만 추가한다. (ADR 0007)
 *
 * <p>형식·크기 검증은 이 계층의 책임이 아니다. 무엇을 유효한 이미지로 볼지는 저장 방식이 아니라
 * 각 API의 업무 규칙이기 때문이다. 호출부에서 검증한 뒤 넘긴다.
 */
public interface ImageStorage {

    /**
     * @param file 저장할 파일
     * @return 저장된 이미지의 조회 URL
     * @throws com.ildangbaek.backend.global.exception.BusinessException 저장 실패 시 SKIN_IMAGE_UPLOAD_FAILED
     */
    String upload(MultipartFile file);
}
