package com.ildangbaek.backend.global.storage;

import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * 이미지를 로컬 디렉터리에 저장한다. (ADR 0007)
 *
 * <p>해커톤 단계의 기본 구현이다. 서버 인스턴스가 여러 대가 되거나 재배포로 디스크가 초기화되면
 * 저장한 이미지를 잃는다. 실제 운영에서는 S3 등 외부 스토리지 구현체로 교체해야 한다.
 *
 * <p>파일명은 클라이언트가 보낸 이름을 쓰지 않고 UUID로 새로 만든다. 경로 조작(`../`)과
 * 파일명 충돌을 함께 막기 위함이다. 확장자도 허용 목록에서 고른 값만 쓴다.
 */
@Slf4j
@Component
public class LocalImageStorage implements ImageStorage {

    private final Path baseDirectory;
    private final String urlPrefix;

    public LocalImageStorage(
            @Value("${app.storage.local.directory}") String directory,
            @Value("${app.storage.local.url-prefix}") String urlPrefix) {
        this.baseDirectory = Path.of(directory).toAbsolutePath().normalize();
        this.urlPrefix = urlPrefix;
    }

    @Override
    public String upload(MultipartFile file) {
        String filename = UUID.randomUUID() + resolveExtension(file.getContentType());
        try {
            Files.createDirectories(baseDirectory);
            Path target = baseDirectory.resolve(filename);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return urlPrefix + filename;
        } catch (IOException e) {
            log.error("이미지 저장 실패: {}", filename, e);
            throw new BusinessException(ErrorCode.SKIN_IMAGE_UPLOAD_FAILED);
        }
    }

    /**
     * 확장자는 검증을 통과한 Content-Type에서만 유도한다. 클라이언트가 보낸 파일명은 신뢰하지 않는다.
     */
    private String resolveExtension(String contentType) {
        if (contentType == null) {
            return "";
        }
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            default -> "";
        };
    }
}
