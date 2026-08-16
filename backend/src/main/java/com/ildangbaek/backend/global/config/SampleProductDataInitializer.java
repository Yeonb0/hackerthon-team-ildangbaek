package com.ildangbaek.backend.global.config;

import com.ildangbaek.backend.domain.product.entity.Ingredient;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductCategory;
import com.ildangbaek.backend.domain.product.entity.ProductDataSource;
import com.ildangbaek.backend.domain.product.entity.ProductIngredient;
import com.ildangbaek.backend.domain.product.repository.IngredientRepository;
import com.ildangbaek.backend.domain.product.repository.ProductIngredientRepository;
import com.ildangbaek.backend.domain.product.repository.ProductRepository;
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
        createProductIfAbsent(
                "8809738600051",
                "ROUND LAB",
                "1025 Dokdo Toner",
                ProductCategory.TONER,
                "https://roundlab.co.kr/web/product/big/202307/55b4f445f1e92a58fc1ed0ff38d3ccdf.jpg",
                new IngredientSeed("Water", "Water", "Moisturizing", true),
                new IngredientSeed("Butylene Glycol", "Butylene Glycol", "Moisturizing", true),
                new IngredientSeed("Panthenol", "Panthenol", "Soothing", true),
                new IngredientSeed("Allantoin", "Allantoin", "Soothing", false)
        );
        createProductIfAbsent(
                "8809541197107",
                "Dr.G",
                "Green Mild Up Sun Plus",
                ProductCategory.SUNCREAM,
                "https://www.dr-g.co.kr/upload/product/202402/20240223140434457522.jpg",
                new IngredientSeed("Zinc Oxide", "Zinc Oxide", "UV Filter", true),
                new IngredientSeed("Titanium Dioxide", "Titanium Dioxide", "UV Filter", true),
                new IngredientSeed("Centella Asiatica Extract", "Centella Asiatica Extract", "Soothing", true),
                new IngredientSeed("Tocopherol", "Tocopherol", "Antioxidant", false)
        );
        createProductIfAbsent(
                "8809643530014",
                "AESTURA",
                "Atobarrier 365 Cream",
                ProductCategory.CREAM,
                "https://www.aestura.com/upload/product/202401/20240110113957756610.jpg",
                new IngredientSeed("Ceramide NP", "Ceramide NP", "Barrier", true),
                new IngredientSeed("Cholesterol", "Cholesterol", "Barrier", true),
                new IngredientSeed("Phytosphingosine", "Phytosphingosine", "Barrier", true),
                new IngredientSeed("Glycerin", "Glycerin", "Moisturizing", false)
        );
        createProductIfAbsent(
                "8809843671234",
                "innisfree",
                "Retinol Cica Ampoule",
                ProductCategory.AMPOULE,
                "https://www.innisfree.com/upload/product/202403/20240318101040815.jpg",
                new IngredientSeed("Retinol", "Retinol", "Texture Care", true),
                new IngredientSeed("Centella Asiatica Extract", "Centella Asiatica Extract", "Soothing", true),
                new IngredientSeed("Niacinamide", "Niacinamide", "Brightening", true),
                new IngredientSeed("Squalane", "Squalane", "Moisturizing", false)
        );
    }

    private void createProductIfAbsent(String barcode, String brandName, String productName,
                                       ProductCategory category, String imageUrl, IngredientSeed... ingredientSeeds) {
        if (productRepository.existsByBarcode(barcode)) {
            return;
        }
        Product product = productRepository.save(Product.builder()
                .brandName(brandName)
                .productName(productName)
                .category(category)
                .barcode(barcode)
                .imageUrl(imageUrl)
                .dataSource(ProductDataSource.SAMPLE)
                .build());

        for (int index = 0; index < ingredientSeeds.length; index++) {
            IngredientSeed seed = ingredientSeeds[index];
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
