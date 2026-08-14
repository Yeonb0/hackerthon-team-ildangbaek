package com.ildangbaek.backend.domain.analysis.repository;

import com.ildangbaek.backend.domain.analysis.entity.IngredientProfile;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IngredientProfileRepository extends JpaRepository<IngredientProfile, Long> {

    List<IngredientProfile> findAllByUserId(Long userId);

    /** USER-02는 성분명을 함께 내려주므로 fetch join으로 성분당 추가 조회를 없앤다. */
    @Query("select p from IngredientProfile p join fetch p.ingredient where p.user.id = :userId")
    List<IngredientProfile> findAllByUserIdWithIngredient(@Param("userId") Long userId);

    Optional<IngredientProfile> findByUserIdAndIngredientId(Long userId, Long ingredientId);

    long countByUserIdAndReactionTypeIn(Long userId, Collection<ReactionType> reactionTypes);

    /**
     * CHECK-02는 이 제품이 가진 성분에 대해서만 판정 여부를 알면 된다. 사용자 전체 프로파일을
     * 읽으면 확정 성분 수와 무관하게 읽는 양이 커진다.
     */
    @Query("select p from IngredientProfile p join fetch p.ingredient "
            + "where p.user.id = :userId and p.ingredient.id in :ingredientIds")
    List<IngredientProfile> findAllByUserIdAndIngredientIdIn(
            @Param("userId") Long userId, @Param("ingredientIds") Collection<Long> ingredientIds);
}
