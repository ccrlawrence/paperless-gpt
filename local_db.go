package main

import (
	"os"
	"path/filepath"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// ModificationHistory represents the schema of the modification_history table
type ModificationHistory struct {
	ID            uint   `gorm:"primaryKey"`             // Auto-incrementing primary key
	DocumentID    uint   `gorm:"not null"`               // Foreign key to documents table (if applicable)
	DateChanged   string `gorm:"not null"`               // Date and time of modification
	ModField      string `gorm:"size:255;not null"`      // Field being modified
	PreviousValue string `gorm:"size:1048576"`           // Previous value of the field
	NewValue      string `gorm:"size:1048576"`           // New value of the field
	Undone        bool   `gorm:"not null;default:false"` // Whether the modification has been undone
	UndoneDate    string `gorm:"default:null"`           // Date and time of undoing the modification
}

// WorkflowCondition represents a condition for triggering a workflow
type WorkflowTrigger struct {
	ID          uint   `gorm:"primaryKey"`                           // Auto-incrementing primary key
	WorkflowID  int    `gorm:"not null;constraint:OnDelete:CASCADE"` // Foreign key to workflows table
	MatchAction string `gorm:"size:255;not null"`                    // Action to match for this condition - more for the future as we're only doing tags at the moment
	MatchData   string `gorm:"size:1048576;not null"`                // Tag to match for this condition - this is going to be JSON array for tags
}

// WorkflowAction represents an action to be taken by a workflow
type WorkflowAction struct {
	ID             uint   `gorm:"primaryKey"`                           // Auto-incrementing primary key
	WorkflowID     int    `gorm:"not null;constraint:OnDelete:CASCADE"` // Foreign key to workflows table
	ExecutionOrder uint   `gorm:"not null"`                             // Defines the order in which actions are executed
	ActionType     string `gorm:"size:255;not null"`                    // Type of action (like "Manual Review", "Auto title", "Auto tag", "Auto OCR", "Apply tags")
	ActionData     string `gorm:"size:1048576"`                         // Data for the action (if applicable, like tags)
}

// Workflow represents a workflow configuration
type Workflow struct {
	ID        int               `gorm:"not null"`              // Auto-incrementing primary key
	Name      string            `gorm:"size:255;not null"`     // Workflow name
	RunOrder  int               `gorm:"not null"`              // Order in which to run the workflow
	Triggers  []WorkflowTrigger `gorm:"foreignKey:WorkflowID"` // Triggers that trigger this workflow - this will only be a singleton in this version
	Actions   []WorkflowAction  `gorm:"foreignKey:WorkflowID"` // Actions to take when conditions are met
	CreatedAt string            `gorm:"not null"`              // Creation timestamp
	// UpdatedAt string            `gorm:"default:null"`          // Last update timestamp
}

// InitializeDB initializes the SQLite database and migrates the schema
func InitializeDB() *gorm.DB {
	// Ensure db directory exists
	dbDir := "db"
	if err := os.MkdirAll(dbDir, os.ModePerm); err != nil {
		log.Fatalf("Failed to create db directory: %v", err)
	}

	dbPath := filepath.Join(dbDir, "modification_history.db")

	// Connect to SQLite database
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Migrate the schema (create the table if it doesn't exist)
	err = db.AutoMigrate(&ModificationHistory{}, &Workflow{}, &WorkflowTrigger{}, &WorkflowAction{})
	if err != nil {
		log.Fatalf("Failed to migrate database schema: %v", err)
	}

	return db
}

// InsertModification inserts a new modification record into the database
func InsertModification(db *gorm.DB, record *ModificationHistory) error {
	log.Debugf("Passed modification record: %+v", record)
	record.DateChanged = time.Now().Format(time.RFC3339) // Set the DateChanged field to the current time
	log.Debugf("Inserting modification record: %+v", record)
	result := db.Create(&record)
	log.Debugf("Insertion result: %+v", result)
	return result.Error
}

// GetModification retrieves a modification record by its ID
func GetModification(db *gorm.DB, id uint) (*ModificationHistory, error) {
	var record ModificationHistory
	result := db.First(&record, id) // GORM's First method retrieves the first record matching the ID
	return &record, result.Error
}

// GetAllModifications retrieves all modification records from the database
func GetAllModifications(db *gorm.DB) ([]ModificationHistory, error) {
	var records []ModificationHistory
	result := db.Order("date_changed DESC").Find(&records) // GORM's Find method retrieves all records
	return records, result.Error
}

// UndoModification marks a modification record as undone and sets the undo date
func SetModificationUndone(db *gorm.DB, record *ModificationHistory) error {
	record.Undone = true
	record.UndoneDate = time.Now().Format(time.RFC3339)
	result := db.Save(&record) // GORM's Save method
	return result.Error
}

// InsertWorkflows inserts all workflows into the database
func InsertWorkflows(db *gorm.DB, workflows []Workflow) error {
	for _, workflow := range workflows {
		workflow.ID = 0                                      // Reset the ID to 0 to ensure it's auto-incremented
		workflow.CreatedAt = time.Now().Format(time.RFC3339) // Set the CreatedAt field to the current time
		result := db.Create(&workflow)                       // GORM's Create method
		if result.Error != nil {
			return result.Error
		}
	}
	return nil
}

// GetAllWorkflows retrieves all workflows from the database
func GetAllWorkflows(db *gorm.DB) ([]Workflow, error) {
	var workflows []Workflow
	result := db.Order("run_order").
		Preload("Triggers").
		Preload("Actions", func(db *gorm.DB) *gorm.DB {
			return db.Order("execution_order")
		}).
		Find(&workflows) // GORM's Find method retrieves all records
	return workflows, result.Error
}

// DeleteAllWorkflows
func OLDDeleteAllWorkflows(db *gorm.DB) error {
	result := db.Exec("DELETE FROM workflows")
	return result.Error
}

func DeleteAllWorkflows(db *gorm.DB) error {
	// Start transaction
	return db.Transaction(func(tx *gorm.DB) error {
		// Delete all actions first
		if err := tx.Unscoped().Where("1=1").Delete(&WorkflowAction{}).Error; err != nil {
			return err
		}

		// Delete all triggers
		if err := tx.Unscoped().Where("1=1").Delete(&WorkflowTrigger{}).Error; err != nil {
			return err
		}

		// Delete all workflows
		if err := tx.Unscoped().Where("1=1").Delete(&Workflow{}).Error; err != nil {
			return err
		}

		return nil
	})
}
