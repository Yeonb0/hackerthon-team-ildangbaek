package com.ildangbaek.backend.api.routine.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ildangbaek.backend.api.routine.dto.response.RoutineProductResponse;
import com.ildangbaek.backend.api.routine.dto.response.RoutineResponse;
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
 * getRoutines()가 루틴마다 따로 조회하던 N+1을 벌크 조회로 바꾼 뒤에도 응답 내용(순서·제품 목록)이
 * 그대로인지 실제 DB(H2)로 고정한다. 목 리포지토리로는 fetch join 쿼리가 실제로 맞는 데이터를
 * 돌려주는지 확인할 수 없다.
 */
@SpringBootTest
@Transactional
class RoutineServiceTest {

    @Autowired
    private RoutineService routineService;
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
    void 루틴별_제품_목록을_순서대로_반환한다() {
        User user = userRepository.save(User.builder()
                .provider(AuthProvider.KAKAO).providerUserId("routine-test").email("r@x.local").build());

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

        List<RoutineResponse> routines = routineService.getRoutines(user, null);

        assertThat(routines).hasSize(2);

        RoutineResponse morningResponse = routines.stream()
                .filter(r -> r.timeSlot() == TimeSlot.MORNING)
                .findFirst().orElseThrow();
        assertThat(morningResponse.productCount()).isEqualTo(2);
        assertThat(morningResponse.products()).extracting(RoutineProductResponse::name)
                .containsExactly("세럼", "토너");

        RoutineResponse nightResponse = routines.stream()
                .filter(r -> r.timeSlot() == TimeSlot.NIGHT)
                .findFirst().orElseThrow();
        assertThat(nightResponse.productCount()).isEqualTo(1);
        assertThat(nightResponse.products()).extracting(RoutineProductResponse::name)
                .containsExactly("크림");
    }

    @Test
    void timeSlot으로_필터링하면_해당_루틴만_반환한다() {
        User user = userRepository.save(User.builder()
                .provider(AuthProvider.KAKAO).providerUserId("routine-filter-test").email("rf@x.local").build());
        routineRepository.save(Routine.builder()
                .user(user).routineName("모닝 루틴").timePeriod(RoutineType.MORNING).build());
        routineRepository.save(Routine.builder()
                .user(user).routineName("나이트 루틴").timePeriod(RoutineType.NIGHT).build());

        List<RoutineResponse> routines = routineService.getRoutines(user, TimeSlot.MORNING);

        assertThat(routines).hasSize(1);
        assertThat(routines.get(0).timeSlot()).isEqualTo(TimeSlot.MORNING);
    }

    @Test
    void 루틴이_없으면_빈_목록을_반환한다() {
        User user = userRepository.save(User.builder()
                .provider(AuthProvider.KAKAO).providerUserId("routine-empty-test").email("re@x.local").build());

        List<RoutineResponse> routines = routineService.getRoutines(user, null);

        assertThat(routines).isEmpty();
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
