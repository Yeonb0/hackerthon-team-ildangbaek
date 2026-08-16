package com.ildangbaek.backend.api.productrecord.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ildangbaek.backend.api.productrecord.dto.response.ProductRecordHomeResponse;
import com.ildangbaek.backend.api.productrecord.dto.response.RoutineSummaryResponse;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductCategory;
import com.ildangbaek.backend.domain.product.entity.ProductDataSource;
import com.ildangbaek.backend.domain.product.entity.UserProduct;
import com.ildangbaek.backend.domain.product.repository.ProductRepository;
import com.ildangbaek.backend.domain.product.repository.UserProductRepository;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.routine.entity.Routine;
import com.ildangbaek.backend.domain.routine.entity.RoutineProduct;
import com.ildangbaek.backend.domain.routine.entity.RoutineType;
import com.ildangbaek.backend.domain.routine.repository.RoutineProductRepository;
import com.ildangbaek.backend.domain.routine.repository.RoutineRepository;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * getHome()이 루틴마다 따로 조회하던 N+1을 벌크 조회로 바꾼 뒤에도 루틴 요약(제품 수·이름 요약)이
 * 그대로인지 실제 DB(H2)로 고정한다.
 */
@SpringBootTest
@Transactional
class ProductRecordServiceTest {

    @Autowired
    private ProductRecordService productRecordService;
    @Autowired
    private RoutineRepository routineRepository;
    @Autowired
    private RoutineProductRepository routineProductRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private UserProductRepository userProductRepository;

    @Test
    void 홈_응답의_루틴_요약이_제품_이름과_개수를_정확히_담는다() {
        User user = userRepository.save(User.builder()
                .provider(AuthProvider.KAKAO).providerUserId("record-home-test").email("h@x.local").build());

        Routine morning = routineRepository.save(Routine.builder()
                .user(user).routineName("모닝 루틴").timePeriod(RoutineType.MORNING).build());
        Routine night = routineRepository.save(Routine.builder()
                .user(user).routineName("나이트 루틴").timePeriod(RoutineType.NIGHT).build());

        Product toner = saveProduct("토너");
        Product serum = saveProduct("세럼");
        Product cream = saveProduct("크림");

        addRoutineProduct(morning, user, serum, 1);
        addRoutineProduct(morning, user, toner, 2);
        addRoutineProduct(night, user, cream, 1);

        ProductRecordHomeResponse home = productRecordService.getHome(user, TimeSlot.MORNING);

        assertThat(home.routines()).hasSize(1);
        RoutineSummaryResponse morningSummary = home.routines().get(0);
        assertThat(morningSummary.productCount()).isEqualTo(2);
        assertThat(morningSummary.productSummary()).isEqualTo("세럼, 토너");
        assertThat(morningSummary.timeSlot()).isEqualTo(TimeSlot.MORNING);
    }

    @Test
    void 해당_시간대에_루틴이_없으면_빈_목록을_반환한다() {
        User user = userRepository.save(User.builder()
                .provider(AuthProvider.KAKAO).providerUserId("record-home-empty-test").email("he@x.local").build());
        routineRepository.save(Routine.builder()
                .user(user).routineName("나이트 루틴").timePeriod(RoutineType.NIGHT).build());

        ProductRecordHomeResponse home = productRecordService.getHome(user, TimeSlot.MORNING);

        assertThat(home.routines()).isEmpty();
    }

    private Product saveProduct(String name) {
        return productRepository.save(Product.builder()
                .brandName("브랜드")
                .productName(name)
                .category(ProductCategory.SERUM)
                .dataSource(ProductDataSource.SAMPLE)
                .build());
    }

    private void addRoutineProduct(Routine routine, User user, Product product, int sequenceOrder) {
        UserProduct userProduct = userProductRepository.save(UserProduct.builder()
                .user(user).product(product).build());
        routineProductRepository.save(RoutineProduct.builder()
                .routine(routine).userProduct(userProduct).sequenceOrder(sequenceOrder).build());
    }
}
