package ca.cinesmart.identity.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.Generated;

import java.time.OffsetDateTime;

@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "username",nullable = false,unique = true)
    private String username;

    @Column(name = "email",nullable = false,unique = true)
    private String email;

    @Column(name = "password_hash", columnDefinition = "TEXT", nullable = false)
    private String passwordHash;

    //To keep track if user has verified their email,without email verification account setup not complete
    @Column(name ="is_verified",columnDefinition = "BOOLEAN DEFAULT FALSE",nullable = false)
    private Boolean isVerified = false;


    /** Maps to TIMESTAMPTZ.* 'insertable/updatable = false' forces Java to let the database handle
     * 'DEFAULT CURRENT_TIMESTAMP'.* '@Generated' syncs the database-created time back into
     * Java immediately after saving.
     * */
    @Column(name = "created_at", nullable = false, updatable = false, insertable = false, columnDefinition = "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP")
    @Generated
    private OffsetDateTime createdAt;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public AppUser() {
    }

    public String getEmail() {
        return email;
    }

    /** Emails are stored lowercased and trimmed (change.md Q9). */
    public void setEmail(String email) {
        this.email = normalizeEmail(email);
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(java.util.Locale.ROOT);
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Boolean getVerified() {
        return isVerified;
    }

    public void setVerified(Boolean verified) {
        isVerified = verified;
    }
}
