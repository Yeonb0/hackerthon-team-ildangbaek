package com.ildangbaek.backend.global.config;

import com.ildangbaek.backend.domain.product.entity.Ingredient;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductCategory;
import com.ildangbaek.backend.domain.product.entity.ProductDataSource;
import com.ildangbaek.backend.domain.product.entity.ProductIngredient;
import com.ildangbaek.backend.domain.product.repository.IngredientRepository;
import com.ildangbaek.backend.domain.product.repository.ProductIngredientRepository;
import com.ildangbaek.backend.domain.product.repository.ProductRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class SampleProductDataInitializer implements CommandLineRunner {

    private final ProductRepository productRepository;
    private final IngredientRepository ingredientRepository;
    private final ProductIngredientRepository productIngredientRepository;

    @Override
    @Transactional
    public void run(String... args) {
        upsertSampleProduct(
                "8809738600051",
                "라운드랩 ROUND LAB",
                "1025 독도 토너",
                ProductCategory.TONER,
                "https://roundlab.co.kr/web/product/big/202307/55b4f445f1e92a58fc1ed0ff38d3ccdf.jpg",
                new IngredientSeed("정제수", "Water", "보습", true),
                new IngredientSeed("부틸렌글라이콜", "Butylene Glycol", "보습", true),
                new IngredientSeed("판테놀", "Panthenol", "진정", true),
                new IngredientSeed("알란토인", "Allantoin", "진정", false)
        );
        upsertSampleProduct(
                "8809541197107",
                "닥터지 Dr.G",
                "그린 마일드 업 선 플러스",
                ProductCategory.SUNCREAM,
                "https://www.dr-g.co.kr/upload/product/202402/20240223140434457522.jpg",
                new IngredientSeed("징크옥사이드", "Zinc Oxide", "자외선 차단", true),
                new IngredientSeed("티타늄디옥사이드", "Titanium Dioxide", "자외선 차단", true),
                new IngredientSeed("병풀추출물", "Centella Asiatica Extract", "진정", true),
                new IngredientSeed("토코페롤", "Tocopherol", "항산화", false)
        );
        upsertSampleProduct(
                "8809643530014",
                "에스트라 AESTURA",
                "아토베리어365 크림",
                ProductCategory.CREAM,
                "https://www.aestura.com/upload/product/202401/20240110113957756610.jpg",
                new IngredientSeed("세라마이드엔피", "Ceramide NP", "장벽", true),
                new IngredientSeed("콜레스테롤", "Cholesterol", "장벽", true),
                new IngredientSeed("피토스핑고신", "Phytosphingosine", "장벽", true),
                new IngredientSeed("글리세린", "Glycerin", "보습", false)
        );
        upsertSampleProduct(
                "8809843671234",
                "이니스프리 innisfree",
                "레티놀 시카 앰플",
                ProductCategory.AMPOULE,
                "https://www.innisfree.com/upload/product/202403/20240318101040815.jpg",
                new IngredientSeed("레티놀", "Retinol", "결 케어", true),
                new IngredientSeed("병풀추출물", "Centella Asiatica Extract", "진정", true),
                new IngredientSeed("나이아신아마이드", "Niacinamide", "미백", true),
                new IngredientSeed("스쿠알란", "Squalane", "보습", false)
        );
    }

    private void upsertSampleProduct(String barcode, String brandName, String productName,
                                     ProductCategory category, String imageUrl, IngredientSeed... ingredientSeeds) {
        Product product = productRepository.findByBarcode(barcode)
                .map(existing -> {
                    existing.updateSampleInfo(brandName, productName, category, imageUrl);
                    return existing;
                })
                .orElseGet(() -> productRepository.save(Product.builder()
                        .brandName(brandName)
                        .productName(productName)
                        .category(category)
                        .barcode(barcode)
                        .imageUrl(imageUrl)
                        .dataSource(ProductDataSource.SAMPLE)
                        .build()));

        upsertIngredients(product, ingredientSeeds);
    }

    private void upsertIngredients(Product product, IngredientSeed... ingredientSeeds) {
        List<ProductIngredient> existingIngredients = productIngredientRepository
                .findAllByProductIdOrderByDisplayOrderAsc(product.getId());
        for (int index = 0; index < ingredientSeeds.length; index++) {
            IngredientSeed seed = ingredientSeeds[index];
            if (index < existingIngredients.size()) {
                existingIngredients.get(index).getIngredient()
                        .updateSampleInfo(seed.koreanName(), seed.englishName(), seed.functionCategory());
                continue;
            }

            Ingredient ingredient = ingredientRepository.save(Ingredient.builder()
                    .koreanName(seed.koreanName())
                    .englishName(seed.englishName())
                    .functionCategory(seed.functionCategory())
                    .build());
            productIngredientRepository.save(ProductIngredient.builder()
                    .product(product)
                    .ingredient(ingredient)
                    .displayOrder(index + 1)
                    .keyIngredient(seed.keyIngredient())
                    .build());
        }
    }

    private record IngredientSeed(
            String koreanName,
            String englishName,
            String functionCategory,
            boolean keyIngredient
    ) {
    }
}
