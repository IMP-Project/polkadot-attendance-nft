package cron

import (
	"log"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/services"
)

type EventSyncCron struct {
	cron        *cron.Cron
	syncService *services.SyncService
}

func NewEventSyncCron(syncService *services.SyncService) *EventSyncCron {
	c := cron.New(cron.WithSeconds(), cron.WithLogger(cron.VerbosePrintfLogger(log.New(log.Writer(), "CRON: ", log.LstdFlags))))
	
	return &EventSyncCron{
		cron:        c,
		syncService: syncService,
	}
}

func (e *EventSyncCron) Start() error {
	log.Println("Initializing Luma sync cron jobs...")

	_, err := e.cron.AddFunc("0 */10 * * * *", func() {
		e.syncEvents()
	})
	if err != nil {
		return err
	}
	log.Println("Event sync scheduled: every 10 minutes")

	_, err = e.cron.AddFunc("30 */5 * * * *", func() {
		e.syncCheckIns()
	})
	if err != nil {
		return err
	}
	log.Println("Check-in sync scheduled: every 5 minutes (2:30 offset)")

	e.cron.Start()
	log.Println("Luma sync cron jobs started successfully")

	go func() {
		log.Println("Running initial Luma sync with staggered delays...")
		
		e.syncEvents()
		
		log.Println("Waiting 2 minutes before initial check-in sync to avoid rate limits...")
		time.Sleep(2 * time.Minute)
		e.syncCheckIns()
		
		log.Println("Initial sync completed")
	}()

	return nil
}

func (e *EventSyncCron) Stop() {
	if e.cron != nil {
		log.Println("Stopping Luma sync cron jobs...")
		e.cron.Stop()
		log.Println("Luma sync cron jobs stopped")
	}
}

func (e *EventSyncCron) syncEvents() {
	startTime := time.Now()
	log.Println("Starting Luma event sync...")

	if err := e.syncService.SyncAllUsers(); err != nil {
		log.Printf("Event sync failed: %v", err)
		
		log.Printf("Event sync failure occurred at %v", time.Now())
		log.Printf("This could be due to:")
		log.Printf("1. API rate limiting (429 errors)")
		log.Printf("2. Network connectivity issues")
		log.Printf("3. Invalid API keys")
		log.Printf("4. Luma API service issues")
		log.Printf("Next sync will retry in 10 minutes")
		return
	}

	duration := time.Since(startTime)
	log.Printf("Luma event sync completed successfully in %v", duration)
}

func (e *EventSyncCron) syncCheckIns() {
	startTime := time.Now()
	log.Println("Starting Luma check-in sync...")

	if err := e.syncService.SyncAllCheckIns(); err != nil {
		log.Printf("Check-in sync failed: %v", err)
		
		log.Printf("Check-in sync failure occurred at %v", time.Now())
		log.Printf("This could be due to:")
		log.Printf("1. API rate limiting (429 errors)")
		log.Printf("2. No guests found for events")
		log.Printf("3. Database connection issues")
		log.Printf("4. Blockchain minting failures")
		log.Printf("Next sync will retry in 5 minutes")
		return
	}

	duration := time.Since(startTime)
	log.Printf("Luma check-in sync completed successfully in %v", duration)
}

func (e *EventSyncCron) GetNextSchedule() map[string]time.Time {
	entries := e.cron.Entries()
	schedule := make(map[string]time.Time)
	
	if len(entries) > 0 {
		schedule["event_sync"] = entries[0].Next
	}
	if len(entries) > 1 {
		schedule["checkin_sync"] = entries[1].Next
	}
	
	return schedule
}