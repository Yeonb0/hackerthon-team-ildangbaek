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
}
