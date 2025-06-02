package cron

import (
	"log"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/services"
)

// EventSyncCron handles periodic syncing of events and check-ins from Luma
type EventSyncCron struct {
	cron        *cron.Cron
	syncService *services.SyncService
}

// NewEventSyncCron creates a new event sync cron job
func NewEventSyncCron(syncService *services.SyncService) *EventSyncCron {
	// Create cron with second precision and logging
	c := cron.New(cron.WithSeconds(), cron.WithLogger(cron.VerbosePrintfLogger(log.New(log.Writer(), "CRON: ", log.LstdFlags))))
	
	return &EventSyncCron{
		cron:        c,
		syncService: syncService,
	}
}

// Start begins the cron job scheduling
func (e *EventSyncCron) Start() error {
	log.Println("Initializing Luma sync cron jobs...")

	// Schedule event sync every 1 minute
	// Format: "0 * * * * *" = every minute at second 0
	_, err := e.cron.AddFunc("0 * * * * *", func() {
		e.syncEvents()
	})
	if err != nil {
		return err
	}
	log.Println("Event sync scheduled: every 1 minute")

	// Schedule check-in sync every 1 minute (30 seconds offset to avoid overlap)
	// Format: "30 * * * * *" = every minute at second 30
	_, err = e.cron.AddFunc("30 * * * * *", func() {
		e.syncCheckIns()
	})
	if err != nil {
		return err
	}
	log.Println("Check-in sync scheduled: every 1 minute (30s offset)")

	// Start the cron scheduler
	e.cron.Start()
	log.Println("Luma sync cron jobs started successfully")

	// Run initial sync immediately
	go func() {
		log.Println("Running initial Luma event and check-in sync...")
		e.syncEvents()
		// Wait 5 seconds before running check-in sync to avoid API rate limits
		time.Sleep(5 * time.Second)
		e.syncCheckIns()
	}()

	return nil
}

// Stop stops the cron job
func (e *EventSyncCron) Stop() {
	if e.cron != nil {
		log.Println("Stopping Luma sync cron jobs...")
		e.cron.Stop()
		log.Println("Luma sync cron jobs stopped")
	}
}

// syncEvents handles the periodic event synchronization
func (e *EventSyncCron) syncEvents() {
	startTime := time.Now()
	log.Println("Starting Luma event sync...")

	if err := e.syncService.SyncAllUsers(); err != nil {
		log.Printf("Event sync failed: %v", err)
		return
	}

	duration := time.Since(startTime)
	log.Printf("Luma event sync completed successfully in %v", duration)
}

// syncCheckIns handles the periodic check-in synchronization and NFT minting
func (e *EventSyncCron) syncCheckIns() {
	startTime := time.Now()
	log.Println("Starting Luma check-in sync...")

	if err := e.syncService.SyncAllCheckIns(); err != nil {
		log.Printf("Check-in sync failed: %v", err)
		return
	}

	duration := time.Since(startTime)
	log.Printf("Luma check-in sync completed successfully in %v", duration)
}