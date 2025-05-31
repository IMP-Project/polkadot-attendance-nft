package database

import (
    "fmt"
    "time"
    "gorm.io/gorm"
    "github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
)

// UserSettings represents user preferences and settings
type UserSettings struct {
    ID           uint64    `json:"id" gorm:"primaryKey;autoIncrement"`
    UserID       uint64    `json:"user_id" gorm:"not null;index"`
    ProfilePic   string    `json:"profile_pic,omitempty"`
    FontSize     string    `json:"font_size" gorm:"default:'medium'"`
    Theme        string    `json:"theme" gorm:"default:'light'"`
    Language     string    `json:"language" gorm:"default:'en'"`
    Notifications bool     `json:"notifications" gorm:"default:true"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
    
    // Foreign key relationship
    User models.User `json:"-" gorm:"foreignKey:UserID"`
}

// EventPermission represents user permissions for events
type EventPermission struct {
    ID        uint64    `json:"id" gorm:"primaryKey;autoIncrement"`
    EventID   string    `json:"event_id" gorm:"not null;index"`
    UserID    uint64    `json:"user_id" gorm:"not null;index"`
    Role      Role      `json:"role" gorm:"not null"`
    CreatedAt time.Time `json:"created_at"`
    
    // Foreign key relationship
    User models.User `json:"-" gorm:"foreignKey:UserID"`
}

type Role string

const (
    RoleOwner     Role = "owner"
    RoleAdmin     Role = "admin"
    RoleModerator Role = "moderator"
    RoleViewer    Role = "viewer"
)

// UserRepository handles user-related database operations
type UserRepository struct {
    db *gorm.DB
}

// NewUserRepository creates a new UserRepository instance
func NewUserRepository(db *gorm.DB) *UserRepository {
    return &UserRepository{db: db}
}

// PermissionRepository handles permission-related database operations
type PermissionRepository struct {
    db *gorm.DB
}

// NewPermissionRepository creates a new PermissionRepository instance
func NewPermissionRepository(db *gorm.DB) *PermissionRepository {
    return &PermissionRepository{db: db}
}

// User repository methods
func (r *UserRepository) Create(user *models.User) error {
    return r.db.Create(user).Error
}

func (r *UserRepository) GetByID(id uint64) (*models.User, error) {
    var user models.User
    err := r.db.Where("id = ?", id).First(&user).Error
    
    if err == gorm.ErrRecordNotFound {
        return nil, nil
    }
    
    if err != nil {
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    
    return &user, nil
}

func (r *UserRepository) GetByWalletAddress(walletAddress string) (*models.User, error) {
    var user models.User
    err := r.db.Where("wallet_address = ?", walletAddress).First(&user).Error
    
    if err == gorm.ErrRecordNotFound {
        return nil, nil
    }
    
    if err != nil {
        return nil, fmt.Errorf("failed to get user by wallet address: %w", err)
    }
    
    return &user, nil
}

func (r *UserRepository) GetOrCreate(walletAddress string) (*models.User, error) {
    // Try to find existing user first
    user, err := r.GetByWalletAddress(walletAddress)
    if err != nil {
        return nil, fmt.Errorf("failed to check existing user: %w", err)
    }
    
    if user != nil {
        return user, nil
    }
    
    // Create new user if not found
    newUser := &models.User{
        WalletAddress: walletAddress,
        CreatedAt:     time.Now(),
        UpdatedAt:     time.Now(),
    }
    
    if err := r.Create(newUser); err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }
    
    return newUser, nil
}

func (r *UserRepository) UpdateLastLogin(userID uint64) error {
    now := time.Now()
    return r.db.Model(&models.User{}).Where("id = ?", userID).Update("last_login", &now).Error
}

// UserSettings repository methods
func (r *UserRepository) GetUserSettings(userID uint64) (*UserSettings, error) {
    var settings UserSettings
    err := r.db.Where("user_id = ?", userID).First(&settings).Error
    
    if err == gorm.ErrRecordNotFound {
        // Return default settings if none exist
        return &UserSettings{
            UserID:        userID,
            FontSize:      "medium",
            Theme:         "light",
            Language:      "en",
            Notifications: true,
        }, nil
    }
    
    if err != nil {
        return nil, fmt.Errorf("failed to get user settings: %w", err)
    }
    
    return &settings, nil
}

func (r *UserRepository) UpdateUserSettings(userID uint64, settings *UserSettings) error {
    // Set the user ID and timestamps
    settings.UserID = userID
    settings.UpdatedAt = time.Now()
    
    // Try to update existing settings
    result := r.db.Model(&UserSettings{}).Where("user_id = ?", userID).Updates(settings)
    
    if result.Error != nil {
        return fmt.Errorf("failed to update user settings: %w", result.Error)
    }
    
    // If no rows were affected, create new settings
    if result.RowsAffected == 0 {
        settings.CreatedAt = time.Now()
        if err := r.db.Create(settings).Error; err != nil {
            return fmt.Errorf("failed to create user settings: %w", err)
        }
    }
    
    return nil
}

// Permission repository methods
func (r *PermissionRepository) Create(permission *EventPermission) error {
    return r.db.Create(permission).Error
}

func (r *PermissionRepository) Delete(userID uint64, eventID string) error {
    return r.db.Where("user_id = ? AND event_id = ?", userID, eventID).Delete(&EventPermission{}).Error
}

func (r *PermissionRepository) GetByUserAndEvent(userID uint64, eventID string) (*EventPermission, error) {
    var permission EventPermission
    err := r.db.Where("user_id = ? AND event_id = ?", userID, eventID).First(&permission).Error
    
    if err == gorm.ErrRecordNotFound {
        return nil, nil
    }
    
    if err != nil {
        return nil, fmt.Errorf("failed to get permission: %w", err)
    }
    
    return &permission, nil
}

// Luma API Key repository methods
func (r *UserRepository) UpdateLumaApiKey(userID uint64, apiKey string) error {
    result := r.db.Model(&models.User{}).Where("id = ?", userID).Update("luma_api_key", apiKey)
    
    if result.Error != nil {
        return fmt.Errorf("failed to update Luma API key: %w", result.Error)
    }
    
    if result.RowsAffected == 0 {
        return fmt.Errorf("user not found")
    }
    
    return nil
}

func (r *UserRepository) GetLumaApiKey(userID uint64) (string, error) {
    var user models.User
    err := r.db.Select("luma_api_key").Where("id = ?", userID).First(&user).Error
    
    if err == gorm.ErrRecordNotFound {
        return "", fmt.Errorf("user not found")
    }
    
    if err != nil {
        return "", fmt.Errorf("failed to get Luma API key: %w", err)
    }
    
    return user.LumaAPIKey, nil
}

func (r *UserRepository) DeleteLumaApiKey(userID uint64) error {
    result := r.db.Model(&models.User{}).Where("id = ?", userID).Update("luma_api_key", "")
    
    if result.Error != nil {
        return fmt.Errorf("failed to delete Luma API key: %w", result.Error)
    }
    
    if result.RowsAffected == 0 {
        return fmt.Errorf("user not found")
    }
    
    return nil
}

// GetUsersWithLumaAPIKey returns all users who have a Luma API key
func (r *UserRepository) GetUsersWithLumaAPIKey() ([]models.User, error) {
    var users []models.User
    err := r.db.Where("luma_api_key IS NOT NULL AND luma_api_key != ''").Find(&users).Error
    
    if err != nil {
        return nil, fmt.Errorf("failed to get users with Luma API key: %w", err)
    }
    
    return users, nil
}