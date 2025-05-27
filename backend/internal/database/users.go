package database

import (
	"database/sql"
	"fmt"
	"time"
)

// User represents a user in the system
type User struct {
	ID            uint64     `json:"id"`
	WalletAddress string     `json:"wallet_address"`
	Username      string     `json:"username,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
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
	ID        uint64    `json:"id"`
	EventID   string    `json:"event_id"`
	UserID    uint64    `json:"user_id"`
	Role      Role      `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

// UserRepository handles database operations for users
type UserRepository struct {
	db *DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(user *User) error {
	query := `
		INSERT INTO users (wallet_address, username) 
		VALUES ($1, $2)
		RETURNING id, created_at
	`
	err := r.db.QueryRow(
		query,
		user.WalletAddress,
		user.Username,
	).Scan(&user.ID, &user.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

// GetByWalletAddress gets a user by wallet address
func (r *UserRepository) GetByWalletAddress(walletAddress string) (*User, error) {
	query := `
		SELECT id, wallet_address, username, created_at, last_login
		FROM users
		WHERE wallet_address = $1
	`

	var user User
	var lastLogin sql.NullTime

	err := r.db.QueryRow(query, walletAddress).Scan(
		&user.ID,
		&user.WalletAddress,
		&user.Username,
		&user.CreatedAt,
		&lastLogin,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if lastLogin.Valid {
		user.LastLogin = &lastLogin.Time
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
	query := `
		UPDATE users
		SET last_login = NOW()
		WHERE id = $1
	`

	result, err := r.db.Exec(query, userID)
	if err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// PermissionRepository handles database operations for event permissions
type PermissionRepository struct {
	db *DB
}

// NewPermissionRepository creates a new permission repository
func NewPermissionRepository(db *DB) *PermissionRepository {
	return &PermissionRepository{db: db}
}

// Create creates a new event permission
func (r *PermissionRepository) Create(perm *EventPermission) error {
	query := `
		INSERT INTO event_permissions (event_id, user_id, role) 
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`
	err := r.db.QueryRow(
		query,
		perm.EventID,
		perm.UserID,
		perm.Role,
	).Scan(&perm.ID, &perm.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create permission: %w", err)
	}

	return nil
}

// GetUserRoleForEvent gets a user's role for an event
func (r *PermissionRepository) GetUserRoleForEvent(userID, eventID uint64) (Role, error) {
	query := `
		SELECT role
		FROM event_permissions
		WHERE user_id = $1 AND event_id = $2
	`

	var role Role
	err := r.db.QueryRow(query, userID, eventID).Scan(&role)

	if err == sql.ErrNoRows {
		return "", nil
	}

	if err != nil {
		return "", fmt.Errorf("failed to get permission: %w", err)
	}

	return role, nil
}

// UpdateRole updates a user's role for an event
func (r *PermissionRepository) UpdateRole(userID, eventID uint64, role Role) error {
	// Check if permission exists
	_, err := r.GetUserRoleForEvent(userID, eventID)
	if err != nil {
		return err
	}

	query := `
		UPDATE event_permissions
		SET role = $1
		WHERE user_id = $2 AND event_id = $3
	`

	result, err := r.db.Exec(query, role, userID, eventID)
	if err != nil {
		return fmt.Errorf("failed to update role: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("permission not found")
	}

	return nil
}

// GetUsersForEvent gets all users with permissions for an event
func (r *PermissionRepository) GetUsersForEvent(eventID uint64) ([]EventPermission, error) {
	query := `
		SELECT p.id, p.event_id, p.user_id, p.role, p.created_at
		FROM event_permissions p
		WHERE p.event_id = $1
		ORDER BY p.user_id
	`

	rows, err := r.db.Query(query, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to query permissions: %w", err)
	}
	defer rows.Close()

	var permissions []EventPermission
	for rows.Next() {
		var perm EventPermission
		err := rows.Scan(
			&perm.ID,
			&perm.EventID,
			&perm.UserID,
			&perm.Role,
			&perm.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan permission: %w", err)
		}
		permissions = append(permissions, perm)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating permissions: %w", err)
	}

	return permissions, nil
}

// GetEventsForUser gets all events a user has permissions for
func (r *PermissionRepository) GetEventsForUser(userID uint64) ([]EventPermission, error) {
	query := `
		SELECT p.id, p.event_id, p.user_id, p.role, p.created_at
		FROM event_permissions p
		WHERE p.user_id = $1
		ORDER BY p.event_id
	`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query permissions: %w", err)
	}
	defer rows.Close()

	var permissions []EventPermission
	for rows.Next() {
		var perm EventPermission
		err := rows.Scan(
			&perm.ID,
			&perm.EventID,
			&perm.UserID,
			&perm.Role,
			&perm.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan permission: %w", err)
		}
		permissions = append(permissions, perm)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating permissions: %w", err)
	}

	return permissions, nil
}

// Delete deletes a permission
func (r *PermissionRepository) Delete(userID uint64, eventID string) error{
	query := `
		DELETE FROM event_permissions
		WHERE user_id = $1 AND event_id = $2
	`

	result, err := r.db.Exec(query, userID, eventID)
	if err != nil {
		return fmt.Errorf("failed to delete permission: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("permission not found")
	}

	return nil
} 