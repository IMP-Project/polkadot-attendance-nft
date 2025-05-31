package database

import (
	"fmt"

	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
	"gorm.io/gorm"
)

// EventRepository handles database operations for events
type EventRepository struct {
	db *gorm.DB
}

// NewEventRepository creates a new event repository
func NewEventRepository(db *gorm.DB) *EventRepository {
	return &EventRepository{db: db}
}

// Create creates a new event
func (r *EventRepository) Create(event *models.Event) error {
	if err := r.db.Create(event).Error; err != nil {
		return fmt.Errorf("failed to create event: %w", err)
	}
	return nil
}

// GetByID gets an event by ID (Note: ID is string in Event model)
func (r *EventRepository) GetByID(id string) (*models.Event, error) {
	var event models.Event
	err := r.db.Where("id = ?", id).First(&event).Error
	
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	
	if err != nil {
		return nil, fmt.Errorf("failed to get event: %w", err)
	}
	
	return &event, nil
}

// GetByLumaID gets an event by Luma API ID (same as ID in this case)
func (r *EventRepository) GetByLumaID(lumaID string) (*models.Event, error) {
	return r.GetByID(lumaID)
}

// GetAll gets all events
func (r *EventRepository) GetAll() ([]models.Event, error) {
	var events []models.Event
	err := r.db.Where("is_deleted = ?", false).Order("created_at DESC").Find(&events).Error
	
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %w", err)
	}
	
	return events, nil
}

// GetByOrganizer gets all events for a specific organizer
func (r *EventRepository) GetByOrganizer(organizer string) ([]models.Event, error) {
	var events []models.Event
	err := r.db.Where("organizer = ? AND is_deleted = ?", organizer, false).Order("created_at DESC").Find(&events).Error
	
	if err != nil {
		return nil, fmt.Errorf("failed to query events by organizer: %w", err)
	}
	
	return events, nil
}

// GetByUserID gets all events for a specific user (including soft-deleted)
func (r *EventRepository) GetByUserID(userID string) ([]models.Event, error) {
	var events []models.Event
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&events).Error
	
	if err != nil {
		return nil, fmt.Errorf("failed to query events by user: %w", err)
	}
	
	return events, nil
}

// GetActiveByUserID gets only active (non-deleted) events for a specific user
func (r *EventRepository) GetActiveByUserID(userID string) ([]models.Event, error) {
	var events []models.Event
	err := r.db.Where("user_id = ? AND is_deleted = ?", userID, false).Order("created_at DESC").Find(&events).Error
	
	if err != nil {
		return nil, fmt.Errorf("failed to query active events by user: %w", err)
	}
	
	return events, nil
}

// Update updates an event
func (r *EventRepository) Update(event *models.Event) error {
	result := r.db.Model(event).Where("id = ?", event.ID).Updates(event)
	
	if result.Error != nil {
		return fmt.Errorf("failed to update event: %w", result.Error)
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("event not found")
	}
	
	return nil
}

// SoftDelete marks an event as deleted without removing it from database
func (r *EventRepository) SoftDelete(id string) error {
	result := r.db.Model(&models.Event{}).Where("id = ?", id).Update("is_deleted", true)
	
	if result.Error != nil {
		return fmt.Errorf("failed to soft delete event: %w", result.Error)
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("event not found")
	}
	
	return nil
}

// Delete permanently deletes an event (use with caution)
func (r *EventRepository) Delete(id string) error {
	result := r.db.Delete(&models.Event{}, "id = ?", id)
	
	if result.Error != nil {
		return fmt.Errorf("failed to delete event: %w", result.Error)
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("event not found")
	}
	
	return nil
}

// BulkCreate creates multiple events in a single transaction
func (r *EventRepository) BulkCreate(events []models.Event) error {
	if len(events) == 0 {
		return nil
	}
	
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.CreateInBatches(events, 100).Error; err != nil {
			return fmt.Errorf("failed to bulk create events: %w", err)
		}
		return nil
	})
}

// CountByUserID returns the number of events for a specific user
func (r *EventRepository) CountByUserID(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&models.Event{}).Where("user_id = ? AND is_deleted = ?", userID, false).Count(&count).Error
	
	if err != nil {
		return 0, fmt.Errorf("failed to count events: %w", err)
	}
	
	return count, nil
}