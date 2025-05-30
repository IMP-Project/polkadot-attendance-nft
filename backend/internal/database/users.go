package database

import (
	"fmt"
	"time"
	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID            uint64     `json:"id" gorm:"primaryKey"`
	WalletAddress string     `json:"wallet_address" gorm:"uniqueIndex;not null"`
	Username      string     `json:"username,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	LastLogin     *time.Time `json:"last_login,omitempty"`
}

// Role defines permission levels
type Role string

const (
	RoleOwner  Role = "owner"
	RoleEditor Role = "editor"
	RoleViewer Role = "viewer"
)

// EventPermission represents a user's permission for an event
type EventPermission struct {
	ID        uint64    `json:"id" gorm:"primaryKey"`
	EventID   string    `json:"event_id" gorm:"not null"`
	UserID    uint64    `json:"user_id" gorm:"not null"`
	Role      Role      `json:"role" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// UserRepository handles database operations for users
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(user *User) error {
	if err := r.db.Create(user).Error; err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

// GetByWalletAddress gets a user by wallet address
func (r *UserRepository) GetByWalletAddress(walletAddress string) (*User, error) {
	var user User
	err := r.db.Where("wallet_address = ?", walletAddress).First(&user).Error
	
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	
	return &user, nil
}

// GetOrCreate gets a user by wallet address or creates a new one
func (r *UserRepository) GetOrCreate(walletAddress string) (*User, error) {
	// Try to get existing user
	user, err := r.GetByWalletAddress(walletAddress)
	if err != nil {
		return nil, err
	}

	// If user exists, return it
	if user != nil {
		return user, nil
	}

	// Create new user
	newUser := &User{
		WalletAddress: walletAddress,
	}
	if err := r.Create(newUser); err != nil {
		return nil, err
	}

	return newUser, nil
}

// UpdateLastLogin updates the last login time for a user
func (r *UserRepository) UpdateLastLogin(userID uint64) error {
	now := time.Now()
	result := r.db.Model(&User{}).Where("id = ?", userID).Update("last_login", &now)
	
	if result.Error != nil {
		return fmt.Errorf("failed to update last login: %w", result.Error)
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("user not found")
	}
	
	return nil
}

// PermissionRepository handles database operations for event permissions
type PermissionRepository struct {
	db *gorm.DB
}

// NewPermissionRepository creates a new permission repository
func NewPermissionRepository(db *gorm.DB) *PermissionRepository {
	return &PermissionRepository{db: db}
}

// Create creates a new event permission
func (r *PermissionRepository) Create(perm *EventPermission) error {
	if err := r.db.Create(perm).Error; err != nil {
		return fmt.Errorf("failed to create permission: %w", err)
	}
	return nil
}

// GetUserRoleForEvent gets a user's role for an event
func (r *PermissionRepository) GetUserRoleForEvent(userID uint64, eventID string) (Role, error) {
	var perm EventPermission
	err := r.db.Where("user_id = ? AND event_id = ?", userID, eventID).First(&perm).Error
	
	if err == gorm.ErrRecordNotFound {
		return "", nil
	}
	
	if err != nil {
		return "", fmt.Errorf("failed to get permission: %w", err)
	}
	
	return perm.Role, nil
}

// UpdateRole updates a user's role for an event
func (r *PermissionRepository) UpdateRole(userID uint64, eventID string, role Role) error {
	result := r.db.Model(&EventPermission{}).
		Where("user_id = ? AND event_id = ?", userID, eventID).
		Update("role", role)
	
	if result.Error != nil {
		return fmt.Errorf("failed to update role: %w", result.Error)
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("permission not found")
	}
	
	return nil
}

// GetUsersForEvent gets all users with permissions for an event
func (r *PermissionRepository) GetUsersForEvent(eventID string) ([]EventPermission, error) {
	var permissions []EventPermission
	err := r.db.Where("event_id = ?", eventID).Order("user_id").Find(&permissions).Error
	
	if err != nil {
		return nil, fmt.Errorf("failed to query permissions: %w", err)
	}
	
	return permissions, nil
}

// GetEventsForUser gets all events a user has permissions for
func (r *PermissionRepository) GetEventsForUser(userID uint64) ([]EventPermission, error) {
	var permissions []EventPermission
	err := r.db.Where("user_id = ?", userID).Order("event_id").Find(&permissions).Error
	
	if err != nil {
		return nil, fmt.Errorf("error querying permissions: %w", err)
	}
	
	return permissions, nil
}

// Delete deletes a permission
func (r *PermissionRepository) Delete(userID uint64, eventID string) error {
	result := r.db.Where("user_id = ? AND event_id = ?", userID, eventID).Delete(&EventPermission{})
	
	if result.Error != nil {
		return fmt.Errorf("failed to delete permission: %w", result.Error)
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("permission not found")
	}
	
	return nil
}