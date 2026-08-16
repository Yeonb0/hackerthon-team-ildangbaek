package com.ildangbaek.backend.global.storage;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

/**
 * 로컬 이미지 저장의 동작과 파일명 생성 규칙을 고정한다. (ADR 0007)
 */
class LocalImageStorageTest {

    @TempDir
    Path tempDir;

    private LocalImageStorage storage() {
        return new LocalImageStorage(tempDir.toString(), "/images/");
    }

    @DisplayName("파일을 저장하고 URL을 반환한다")
    @Test
    void uploadsFile() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "image", "face.jpg", "image/jpeg", "content".getBytes());

        String url = storage().upload(file);

        assertThat(url).startsWith("/images/").endsWith(".jpg");
        Path saved = tempDir.resolve(url.substring("/images/".length()));
        assertThat(saved).exists();
        assertThat(Files.readString(saved)).isEqualTo("content");
    }

    @DisplayName("Content-Type에 맞는 확장자를 붙인다")
    @Test
    void usesExtensionFromContentType() {
        MockMultipartFile png = new MockMultipartFile(
                "image", "face.jpg", "image/png", "content".getBytes());

        // 파일명이 .jpg여도 Content-Type이 png면 .png로 저장된다 — 클라이언트 파일명을 신뢰하지 않는다
        assertThat(storage().upload(png)).endsWith(".png");
    }

    @DisplayName("클라이언트가 보낸 파일명은 쓰지 않는다 — 경로 조작 방지")
    @Test
    void ignoresClientFilename() {
        MockMultipartFile malicious = new MockMultipartFile(
                "image", "../../etc/passwd", "image/jpeg", "content".getBytes());

        String url = storage().upload(malicious);

        assertThat(url).doesNotContain("..").doesNotContain("passwd");
        assertThat(tempDir.resolve(url.substring("/images/".length()))).exists();
    }

    @DisplayName("같은 이름으로 여러 번 올려도 서로 덮어쓰지 않는다")
    @Test
    void generatesUniqueNames() {
        MockMultipartFile file = new MockMultipartFile(
                "image", "face.jpg", "image/jpeg", "content".getBytes());
        LocalImageStorage storage = storage();

        assertThat(storage.upload(file)).isNotEqualTo(storage.upload(file));
    }

    @DisplayName("디렉터리가 없으면 만들어서 저장한다")
    @Test
    void createsDirectory() {
        Path nested = tempDir.resolve("nested/images");
        MockMultipartFile file = new MockMultipartFile(
                "image", "face.jpg", "image/jpeg", "content".getBytes());

        new LocalImageStorage(nested.toString(), "/images/").upload(file);

        assertThat(nested).exists();
    }
}
