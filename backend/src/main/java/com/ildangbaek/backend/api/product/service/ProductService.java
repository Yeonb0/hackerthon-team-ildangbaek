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
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductIngredientRepository productIngredientRepository;
    private final IngredientRepository ingredientRepository;
    private final UserProductRepository userProductRepository;
    private final ImageStorage imageStorage;

    @Transactional(readOnly = true)
    public ProductSearchResponse search(User user, String keyword) {
        if (keyword == null || keyword.isBlank() || keyword.length() > 50) {
            throw new BusinessException(ErrorCode.PRODUCT_INVALID_KEYWORD);
        }
        List<ProductSummaryResponse> products = productRepository
                .findTop20ByProductNameContainingIgnoreCaseAndActiveTrue(keyword.trim())
                .stream()
                .map(product -> toSummary(user, product))
                .toList();
        return new ProductSearchResponse(keyword, products.size(), products);
    }

    @Transactional(readOnly = true)
    public ProductDetailResponse getDetail(User user, Long productId) {
        Product product = productRepository.findById(productId)
                .filter(Product::isActive)
                .orElseThrow(() -> new BusinessException(ErrorCode.PRODUCT_NOT_FOUND));
        List<ProductIngredient> productIngredients =
                productIngredientRepository.findAllByProductIdOrderByDisplayOrderAsc(productId);
        List<IngredientResponse> ingredients = productIngredients.stream()
                .map(this::toIngredient)
                .toList();
        List<IngredientResponse> keyIngredients = productIngredients.stream()
                .filter(ProductIngredient::isKeyIngredient)
                .limit(10)
                .map(this::toIngredient)
                .toList();

        return new ProductDetailResponse(
                product.getId(),
                product.getProductName(),
                product.getBrandName(),
                product.getCategory().name(),
                product.getImageUrl(),
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
                product.getImageUrl(),
                1.0
        );
    }

    @Transactional(readOnly = true)
    public ProductScanResponse scan(ScanMode scanMode, MultipartFile image) {
        if (scanMode == null) {
            throw new BusinessException(ErrorCode.SCAN_UNSUPPORTED_MODE);
        }
        Product product = productRepository.findFirstByActiveTrueOrderByIdAsc()
                .orElseThrow(() -> new BusinessException(ErrorCode.SCAN_PRODUCT_NOT_DETECTED));
        double confidence = scanMode == ScanMode.BARCODE ? 1.0 : 0.92;
        return new ProductScanResponse(
                product.getId(),
                product.getProductName(),
                product.getBrandName(),
                product.getCategory().name(),
                product.getImageUrl(),
                confidence
        );
    }

    @Transactional
    public ProductRegisterResponse registerProduct(User user, ProductRegisterRequest request, MultipartFile image) {
        String imageUrl = image != null && !image.isEmpty() ? imageStorage.upload(image) : null;

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
            int displayOrder = 1;
            for (String ingredientName : ingredientNames) {
                if (ingredientName == null || ingredientName.isBlank()) {
                    continue;
                }
                Ingredient ingredient = ingredientRepository.findByKoreanName(ingredientName.trim())
                        .orElseGet(() -> ingredientRepository.save(Ingredient.builder()
                                .koreanName(ingredientName.trim())
                                .build()));
                productIngredientRepository.save(ProductIngredient.builder()
                        .product(product)
                        .ingredient(ingredient)
                        .displayOrder(displayOrder++)
                        .keyIngredient(false)
                        .build());
            }
        }

        return new ProductRegisterResponse(
                product.getId(),
                product.getProductName(),
                product.getBrandName(),
                product.getCategory().name(),
                product.getImageUrl()
        );
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

    private ProductSummaryResponse toSummary(User user, Product product) {
        return new ProductSummaryResponse(
                product.getId(),
                product.getProductName(),
                product.getBrandName(),
                product.getCategory().name(),
                product.getImageUrl(),
                isSaved(user, product)
        );
    }

    private IngredientResponse toIngredient(ProductIngredient productIngredient) {
        return new IngredientResponse(
                productIngredient.getIngredient().getId(),
                productIngredient.getIngredient().getKoreanName(),
                "INSUFFICIENT",
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
