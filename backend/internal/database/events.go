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

// GetByID gets an event by ID
func (r *EventRepository) GetByID(id uint64) (*models.Event, error) {
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

// GetAll gets all events
func (r *EventRepository) GetAll() ([]models.Event, error) {
	var events []models.Event
	err := r.db.Order("created_at DESC").Find(&events).Error
	
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %w", err)
	}
	
	return events, nil
}

// GetByOrganizer gets all events for a specific organizer
func (r *EventRepository) GetByOrganizer(organizer string) ([]models.Event, error) {
	var events []models.Event
	err := r.db.Where("organizer = ?", organizer).Order("created_at DESC").Find(&events).Error
	
	if err != nil {
		return nil, fmt.Errorf("failed to query events by organizer: %w", err)
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

// Delete deletes an event
func (r *EventRepository) Delete(id uint64) error {
	result := r.db.Delete(&models.Event{}, id)
	
	if result.Error != nil {
		return fmt.Errorf("failed to delete event: %w", result.Error)
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("event not found")
	}
	
	return nil
}