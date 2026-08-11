package com.ildangbaek.backend.domain.analysis.repository;

import com.ildangbaek.backend.domain.analysis.entity.IngredientProfile;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IngredientProfileRepository extends JpaRepository<IngredientProfile, Long> {

    List<IngredientProfile> findAllByUserId(Long userId);

    Optional<IngredientProfile> findByUserIdAndIngredientId(Long userId, Long ingredientId);

    long countByUserIdAndReactionTypeIn(Long userId, Collection<ReactionType> reactionTypes);
}
