package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"slices"
	"strings"
)

// processWorkflows processes all workflows in order
func (app *App) processWorkflows() (int, error) {
	ctx := context.Background()
	processedCount := 0

	// Get all workflows ordered by run_order
	workflows, err := GetAllWorkflows(app.Database)
	if err != nil {
		return 0, fmt.Errorf("failed to get workflows: %w", err)
	}

	// Skip manual review workflows (run_order = -1)
	for _, workflow := range workflows {
		if workflow.RunOrder == -1 {
			log.Debug("Skipping manual review workflow")
			continue
		}

		log.Debugf("Processing workflow: %s (run_order: %d)", workflow.Name, workflow.RunOrder)

		// Process workflow triggers
		documents, err := app.processWorkflowTriggers(ctx, workflow)
		if err != nil {
			return processedCount, fmt.Errorf("failed to process triggers for workflow %s: %w", workflow.Name, err)
		}

		if len(documents) == 0 {
			log.Debugf("No documents matched triggers for workflow: %s", workflow.Name)
			continue
		}

		log.Infof("Found %d documents for workflow: %s", len(documents), workflow.Name)

		// Process workflow actions for each document
		for _, doc := range documents {
			log.Debugf("Processing document %d with workflow: %s", doc.ID, workflow.Name)
			if err := app.processWorkflowActions(ctx, workflow, doc); err != nil {
				log.Errorf("Error processing document %d with workflow %s: %v", doc.ID, workflow.Name, err)
				continue
			}
			processedCount++
		}
	}

	return processedCount, nil
}

// processWorkflowTriggers checks all triggers for a workflow and returns matching documents
func (app *App) processWorkflowTriggers(ctx context.Context, workflow Workflow) ([]Document, error) {
	var matchedDocs []Document

	for _, trigger := range workflow.Triggers {
		log.Debugf("Processing trigger: %s", trigger.MatchAction)

		switch trigger.MatchAction {
		case "Match tags":
			var tags []string
			if err := json.Unmarshal([]byte(trigger.MatchData), &tags); err != nil {
				return nil, fmt.Errorf("failed to unmarshal tags for trigger: %w", err)
			}

			docs, err := app.Client.GetDocumentsByTags(ctx, tags)
			if err != nil {
				return nil, fmt.Errorf("failed to get documents by tags: %w", err)
			}
			matchedDocs = append(matchedDocs, docs...)

		// New triggers here??
		default:
			log.Warnf("Unknown trigger action: %s", trigger.MatchAction)
		}
	}

	return matchedDocs, nil
}

// processWorkflowActions executes all actions in a workflow for a document
func (app *App) processWorkflowActions(ctx context.Context, workflow Workflow, doc Document) error {
	// Get the trigger tags that matched this document
	var triggerTags []string
	for _, trigger := range workflow.Triggers {
		if trigger.MatchAction == "Match tags" {
			if err := json.Unmarshal([]byte(trigger.MatchData), &triggerTags); err != nil {
				return fmt.Errorf("failed to unmarshal trigger tags: %w", err)
			}
			break
		}
	}

	suggestion := DocumentSuggestion{
		ID:               doc.ID,
		OriginalDocument: doc,
		SuggestedTitle:   doc.Title,   // Default to current values
		SuggestedTags:    doc.Tags,    // Default to current values
		SuggestedContent: doc.Content, // Default to current values
	}

	// First remove the trigger tags that caused this document to be processed - this could be earlier, maybe? But this is where we are updating things...
	suggestion.SuggestedTags = removeTagsFromList(suggestion.SuggestedTags, triggerTags)
	log.Debugf("Removed trigger tags %v from document %d", triggerTags, doc.ID)

	for _, action := range workflow.Actions {
		log.Debugf("Processing action: %s for document %d", action.ActionType, doc.ID)

		switch action.ActionType {
		case "Auto title":
			title, err := app.getSuggestedTitle(ctx, doc.Content)
			if err != nil {
				return fmt.Errorf("failed to generate title: %w", err)
			}
			suggestion.SuggestedTitle = title
			log.Debugf("Generated title for document %d: %s", doc.ID, title)

		case "Auto tag":
			tags, err := app.getSuggestedTags(ctx, doc.Content, suggestion.SuggestedTitle, nil) // nil will fetch all available tags
			if err != nil {
				return fmt.Errorf("failed to generate tags: %w", err)
			}
			suggestion.SuggestedTags = tags
			log.Debugf("Generated tags for document %d: %v", doc.ID, tags)

		case "Auto OCR":
			// Get document image
			imagePaths, err := app.Client.DownloadDocumentAsImages(ctx, doc.ID)
			if err != nil {
				return fmt.Errorf("error downloading document images for doc %d: %v", doc.ID, err)
			}

			var ocrTexts []string
			for _, imagePath := range imagePaths {
				imageContent, err := os.ReadFile(imagePath)
				if err != nil {
					return fmt.Errorf("error reading image file for doc %d: %v", doc.ID, err)
				}

				ocrText, err := app.doOCRViaLLM(ctx, imageContent)
				if err != nil {
					return fmt.Errorf("error performing OCR for doc %d: %v", doc.ID, err)
				}

				ocrTexts = append(ocrTexts, ocrText)
			}

			// Combine the OCR texts
			fullOcrText := strings.Join(ocrTexts, "\n\n")

			// Only update if we got OCR text
			if fullOcrText != "" {
				// Merge with existing content if present
				if suggestion.SuggestedContent != "" {
					suggestion.SuggestedContent = fmt.Sprintf("%s\n\nOCR Content:\n%s",
						suggestion.SuggestedContent, fullOcrText)
				} else {
					suggestion.SuggestedContent = fullOcrText
				}
				log.Debugf("Added OCR content for document %d", doc.ID)
			} else {
				log.Warnf("OCR produced no text for document %d", doc.ID)
			}

		case "Apply tags":
			var tags []string
			if err := json.Unmarshal([]byte(action.ActionData), &tags); err != nil {
				return fmt.Errorf("failed to unmarshal tags for action: %w", err)
			}
			suggestion.SuggestedTags = append(suggestion.SuggestedTags, tags...)
			log.Debugf("Applied additional tags to document %d: %v", doc.ID, tags)

		default:
			log.Warnf("Unknown action type: %s", action.ActionType)
		}
	}

	// Update the document with all changes
	err := app.Client.UpdateDocuments(ctx, []DocumentSuggestion{suggestion}, app.Database, false)
	if err != nil {
		return fmt.Errorf("failed to update document: %w", err)
	}

	log.Infof("Successfully processed document %d with workflow %s", doc.ID, workflow.Name)
	return nil
}

// removeTagsFromList removes a list of tags from another list of tags
func removeTagsFromList(tags []string, tagsToRemove []string) []string {
	filteredTags := make([]string, 0, len(tags))
	for _, tag := range tags {
		if !slices.Contains(tagsToRemove, tag) {
			filteredTags = append(filteredTags, tag)
		}
	}
	return filteredTags
}
