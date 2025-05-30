package cron

import (
	"log"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/services"
)

// EventSyncCron manages the periodic synchronization of Luma events
type EventSyncCron struct {
	cron        *cron.Cron
	syncService *services.SyncService
}

// NewEventSyncCron creates a new event sync cron job
func NewEventSyncCron(syncService *services.SyncService) *EventSyncCron {
	return &EventSyncCron{
		cron:        cron.New(),
		syncService: syncService,
	}
}

// Start begins the cron job
func (e *EventSyncCron) Start() error {
	// Run sync immediately on startup
	log.Println("Running initial Luma event sync...")
	go e.runSync()

	// Schedule to run every 5 minutes
	_, err := e.cron.AddFunc("*/5 * * * *", e.runSync)
	if err != nil {
		return err
	}

	// Start the cron scheduler
	e.cron.Start()
	log.Println("Luma event sync cron job started (runs every 5 minutes)")
	
	return nil
}

// Stop gracefully stops the cron job
func (e *EventSyncCron) Stop() {
	log.Println("Stopping Luma event sync cron job...")
	ctx := e.cron.Stop()
	<-ctx.Done()
	log.Println("Luma event sync cron job stopped")
}

// runSync executes the sync process
func (e *EventSyncCron) runSync() {
	startTime := time.Now()
	log.Println("Starting Luma event sync...")

	err := e.syncService.SyncAllUsers() // ✅ Corrected: Only one return value
	if err != nil {
		log.Printf("Error during Luma sync: %v", err)
		return
	}

	duration := time.Since(startTime)
	log.Printf("Luma sync completed in %v", duration)
}
