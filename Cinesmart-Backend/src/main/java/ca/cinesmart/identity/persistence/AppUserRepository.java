package ca.cinesmart.identity.persistence;

import ca.cinesmart.identity.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * Case-insensitive lookups (change.md Q9). They use LOWER() so the V021 unique indexes
 * on LOWER(username) / LOWER(email) serve them (derived "IgnoreCase" queries would use UPPER()).
 */
public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    @Query("SELECT u FROM AppUser u WHERE LOWER(u.username) = LOWER(:username)")
    Optional<AppUser> findByUsernameIgnoreCase(@Param("username") String username);

    @Query("SELECT u FROM AppUser u WHERE LOWER(u.email) = LOWER(:email)")
    Optional<AppUser> findByEmailIgnoreCase(@Param("email") String email);

    @Query("SELECT COUNT(u) > 0 FROM AppUser u WHERE LOWER(u.username) = LOWER(:username)")
    boolean existsByUsernameIgnoreCase(@Param("username") String username);

    @Query("SELECT COUNT(u) > 0 FROM AppUser u WHERE LOWER(u.email) = LOWER(:email)")
    boolean existsByEmailIgnoreCase(@Param("email") String email);
}
