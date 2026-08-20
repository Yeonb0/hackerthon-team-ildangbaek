package com.ildangbaek.backend.api.product.service;

import com.ildangbaek.backend.api.product.dto.request.ProductRegisterRequest;
import com.ildangbaek.backend.api.product.dto.request.ProductScanRequest;
import com.ildangbaek.backend.api.product.dto.request.ScanMode;
import com.ildangbaek.backend.api.product.dto.response.IngredientResponse;
import com.ildangbaek.backend.api.product.dto.response.ProductDetailResponse;
import com.ildangbaek.backend.api.product.dto.response.ProductMatchResponse;
import com.ildangbaek.backend.api.product.dto.response.ProductRegisterResponse;
import com.ildangbaek.backend.api.product.dto.response.ProductSaveResponse;
import com.ildangbaek.backend.api.product.dto.response.ProductScanResponse;
import com.ildangbaek.backend.api.product.dto.response.ProductSearchResponse;
import com.ildangbaek.backend.api.product.dto.response.ProductSummaryResponse;
import com.ildangbaek.backend.domain.analysis.entity.IngredientProfile;
import com.ildangbaek.backend.domain.analysis.entity.IngredientStatus;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import com.ildangbaek.backend.domain.product.entity.Ingredient;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductDataSource;
import com.ildangbaek.backend.domain.product.entity.ProductIngredient;
import com.ildangbaek.backend.domain.product.entity.UsageStatus;
import com.ildangbaek.backend.domain.product.entity.UserProduct;
import com.ildangbaek.backend.domain.product.repository.IngredientRepository;
import com.ildangbaek.backend.domain.product.repository.ProductIngredientRepository;
import com.ildangbaek.backend.domain.product.repository.ProductRepository;
import com.ildangbaek.backend.domain.product.repository.UserProductRepository;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import com.ildangbaek.backend.global.storage.ImageStorage;
import com.ildangbaek.backend.global.storage.ImageUrlResolver;
import java.util.HashSet;
import java.util.Map;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ProductService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png");
    private static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;
    private static final int KEY_INGREDIENT_LIMIT = 10;

    private final ProductRepository productRepository;
    private final ProductIngredientRepository productIngredientRepository;
    private final IngredientRepository ingredientRepository;
    private final UserProductRepository userProductRepository;
    private final IngredientProfileRepository ingredientProfileRepository;
    private final ImageStorage imageStorage;
    private final ImageUrlResolver imageUrlResolver;

    @Transactional(readOnly = true)
    public ProductSearchResponse search(User user, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return new ProductSearchResponse("", 0, List.of());
        }
        String trimmedKeyword = keyword.trim();
        if (trimmedKeyword.length() > 50) {
            throw new BusinessException(ErrorCode.PRODUCT_INVALID_KEYWORD);
        }
        List<ProductSummaryResponse> products = productRepository
                .findTop20ByActiveTrueAndProductNameContainingIgnoreCaseOrActiveTrueAndBrandNameContainingIgnoreCase(
                        trimmedKeyword,
                        trimmedKeyword
                )
                .stream()
                .map(product -> toSummary(user, product))
                .toList();
        return new ProductSearchResponse(trimmedKeyword, products.size(), products);
    }

    @Transactional(readOnly = true)
    public ProductDetailResponse getDetail(User user, Long productId) {
        Product product = productRepository.findById(productId)
                .filter(Product::isActive)
                .orElseThrow(() -> new BusinessException(ErrorCode.PRODUCT_NOT_FOUND));
        List<ProductIngredient> productIngredients =
                productIngredientRepository.findAllByProductIdOrderByDisplayOrderAsc(productId);
        Map<Long, IngredientProfile> profilesByIngredientId = findProfiles(user, productIngredients);
        List<IngredientResponse> ingredients = productIngredients.stream()
                .map(productIngredient -> toIngredient(
                        productIngredient,
                        profilesByIngredientId.get(productIngredient.getIngredient().getId())))
                .toList();
        List<IngredientResponse> keyIngredients = productIngredients.stream()
                .filter(ProductIngredient::isKeyIngredient)
                .limit(KEY_INGREDIENT_LIMIT)
                .map(productIngredient -> toIngredient(
                        productIngredient,
                        profilesByIngredientId.get(productIngredient.getIngredient().getId())))
                .toList();

        return new ProductDetailResponse(
                product.getId(),
                product.getProductName(),
                product.getBrandName(),
                product.getCategory().name(),
                imageUrlResolver.resolve(product.getImageUrl()),
                isSaved(user, product),
                ingredients.size(),
                keyIngredients,
                ingredients
        );
    }

    @Transactional(readOnly = true)
    public ProductMatchResponse match(String name, String brand) {
        if (name == null || name.isBlank() || brand == null || brand.isBlank()) {
            return ProductMatchResponse.notMatched();
        }
        return productRepository
                .findFirstByProductNameContainingIgnoreCaseAndBrandNameContainingIgnoreCaseAndActiveTrue(
                        name.trim(),
                        brand.trim()
                )
                .map(this::toMatchResponse)
                .orElseGet(ProductMatchResponse::notMatched);
    }

    @Transactional(readOnly = true)
    public ProductScanResponse scan(ProductScanRequest request) {
        if (request.scanMode() != ScanMode.BARCODE) {
            throw new BusinessException(ErrorCode.SCAN_SERVICE_UNAVAILABLE);
        }
        Product product = productRepository.findByBarcode(request.barcode())
                .filter(Product::isActive)
                .orElseThrow(() -> new BusinessException(ErrorCode.SCAN_PRODUCT_NOT_DETECTED));
        return new ProductScanResponse(
                product.getId(),
                product.getProductName(),
                product.getBrandName(),
                product.getCategory().name(),
                imageUrlResolver.resolve(product.getImageUrl()),
                1.0
        );
    }

    @Transactional(readOnly = true)
    public ProductScanResponse scan(ScanMode scanMode, MultipartFile image) {
        if (scanMode == null) {
            throw new BusinessException(ErrorCode.SCAN_UNSUPPORTED_MODE);
        }
        // 이미지에서 바코드를 디코딩하거나 상품을 인식하는 비전 로직이 아직 없다.
        // 인식한 것처럼 임의 제품을 돌려주는 대신 서비스 미지원으로 명확히 응답한다.
        // 바코드는 /scan(JSON, barcode 문자열)으로만 실제 조회가 가능하다.
        throw new BusinessException(ErrorCode.SCAN_SERVICE_UNAVAILABLE);
    }

    @Transactional
    public ProductRegisterResponse registerProduct(User user, ProductRegisterRequest request, MultipartFile image) {
        String imageUrl = null;
        if (image != null && !image.isEmpty()) {
            validateImage(image);
            imageUrl = imageStorage.upload(image);
        }

        Product product = productRepository.save(Product.builder()
                .brandName(request.brand())
                .productName(request.name())
                .category(request.category())
                .barcode(null)
                .imageUrl(imageUrl)
                .dataSource(ProductDataSource.USER)
                .build());

        List<String> ingredientNames = request.ingredientNames();
        if (ingredientNames != null) {
            // product_ingredients의 (product_id, ingredient_id) 유니크 제약 때문에 같은 성분을
            // 두 번 넣으면 flush에서 터진다. 사용자가 " 정제수 "처럼 공백만 다르게 두 번 입력하는
            // 경우가 흔해 정규화한 이름 기준으로 걸러낸다.
            Set<String> addedNames = new HashSet<>();
            int displayOrder = 1;
            for (String rawName : ingredientNames) {
                if (rawName == null || rawName.isBlank()) {
                    continue;
                }
                String ingredientName = rawName.trim();
                if (!addedNames.add(ingredientName)) {
                    continue;
                }
                Ingredient ingredient = ingredientRepository.findByKoreanName(ingredientName)
                        .orElseGet(() -> ingredientRepository.save(Ingredient.builder()
                                .koreanName(ingredientName)
                                .build()));
                boolean keyIngredient = displayOrder <= KEY_INGREDIENT_LIMIT;
                productIngredientRepository.save(ProductIngredient.builder()
                        .product(product)
                        .ingredient(ingredient)
                        .displayOrder(displayOrder)
                        .keyIngredient(keyIngredient)
                        .build());
                displayOrder++;
            }
        }

        saveUserProduct(user, product);

        return new ProductRegisterResponse(
                product.getId(),
                product.getProductName(),
                product.getBrandName(),
                product.getCategory().name(),
                imageUrlResolver.resolve(product.getImageUrl())
        );
    }

    /**
     * 제품 사진 검증. {@link ImageStorage}는 형식·크기를 보지 않으므로 호출부에서 확인한다.
     *
     * <p>규칙과 오류 코드는 피부 기록 이미지와 같다(공통응답포맷_예외처리코드 9.3 이미지).
     * 사진은 선택 항목이라 비어 있는 경우는 호출부에서 걸러 이 메서드까지 오지 않는다.
     */
    private void validateImage(MultipartFile image) {
        String contentType = image.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new BusinessException(ErrorCode.SKIN_IMAGE_INVALID_FORMAT);
        }
        if (image.getSize() > MAX_IMAGE_BYTES) {
            throw new BusinessException(ErrorCode.SKIN_IMAGE_TOO_LARGE);
        }
    }

    @Transactional
    public ProductSaveResponse saveProduct(User user, Long productId) {
        Product product = productRepository.findById(productId)
                .filter(Product::isActive)
                .orElseThrow(() -> new BusinessException(ErrorCode.PRODUCT_NOT_FOUND));
        UserProduct userProduct = userProductRepository.findByUserIdAndProductId(user.getId(), productId)
                .orElseGet(() -> UserProduct.builder()
                        .user(user)
                        .product(product)
                        .build());
        userProduct.resumeUsing();
        userProductRepository.save(userProduct);
        return new ProductSaveResponse(productId, true);
    }

    @Transactional
    public ProductSaveResponse unsaveProduct(User user, Long productId) {
        UserProduct userProduct = userProductRepository.findByUserIdAndProductId(user.getId(), productId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PRODUCT_NOT_FOUND));
        userProduct.stopUsing();
        userProductRepository.save(userProduct);
        return new ProductSaveResponse(productId, false);
    }

    private void saveUserProduct(User user, Product product) {
        UserProduct userProduct = userProductRepository.findByUserIdAndProductId(user.getId(), product.getId())
                .orElseGet(() -> UserProduct.builder()
                        .user(user)
                        .product(product)
                        .build());
        userProduct.resumeUsing();
        userProductRepository.save(userProduct);
    }

    private ProductSummaryResponse toSummary(User user, Product product) {
        return new ProductSummaryResponse(
                product.getId(),
                product.getProductName(),
                product.getBrandName(),
                product.getCategory().name(),
                imageUrlResolver.resolve(product.getImageUrl()),
                isSaved(user, product)
        );
    }

    private Map<Long, IngredientProfile> findProfiles(User user, List<ProductIngredient> productIngredients) {
        List<Long> ingredientIds = productIngredients.stream()
                .map(productIngredient -> productIngredient.getIngredient().getId())
                .toList();
        if (ingredientIds.isEmpty()) {
            return Map.of();
        }
        return ingredientProfileRepository.findAllByUserIdAndIngredientIdIn(user.getId(), ingredientIds)
                .stream()
                .collect(Collectors.toMap(profile -> profile.getIngredient().getId(), profile -> profile));
    }

    private IngredientResponse toIngredient(ProductIngredient productIngredient, IngredientProfile profile) {
        ReactionType reactionType = profile == null ? ReactionType.INSUFFICIENT : profile.getReactionType();
        return new IngredientResponse(
                productIngredient.getIngredient().getId(),
                productIngredient.getIngredient().getKoreanName(),
                IngredientStatus.from(reactionType).name(),
                productIngredient.getConcentrationText()
        );
    }

    private ProductMatchResponse toMatchResponse(Product product) {
        List<String> ingredients = productIngredientRepository.findAllByProductIdOrderByDisplayOrderAsc(product.getId())
                .stream()
                .map(productIngredient -> productIngredient.getIngredient().getKoreanName())
                .toList();
        return new ProductMatchResponse(
                true,
                product.getId(),
                product.getCategory().name(),
                ingredients
        );
    }

    private boolean isSaved(User user, Product product) {
        return userProductRepository.existsByUserIdAndProductIdAndUsageStatus(
                user.getId(),
                product.getId(),
                UsageStatus.USING
        );
    }
}
