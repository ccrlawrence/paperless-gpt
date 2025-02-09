// WorkflowManualCard.tsx
import React, { useState } from 'react';
import { TagOption, Workflow, WorkflowTrigger } from '../Workflows';
import { ReactTags } from "react-tag-autocomplete";

interface WorkflowManualCardProps {
    availableTags: TagOption[];
    initialWorkflow: Workflow;
    onUpdate: (workflow: Workflow) => void;
}

const WorkflowManualCard: React.FC<WorkflowManualCardProps> = ({
    availableTags,
    initialWorkflow,
    onUpdate,
}) => {
    const [workflow, setWorkflow] = useState<Workflow>(initialWorkflow);

    const updateTrigger = (index: number, updates: Partial<WorkflowTrigger>) => {
        const newWorkflow = { ...workflow };
        newWorkflow.Triggers[index] = {
            ...newWorkflow.Triggers[index],
            ...updates
        };
        setWorkflow(newWorkflow);
        onUpdate(newWorkflow);
    };

    return (
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-4">
            <div className="mb-4">
                <input
                    type="text"
                    value={workflow.Name}
                    onChange={(e) => setWorkflow({ ...workflow, Name: e.target.value })}
                    placeholder="Manual Review Workflow"
                    className="w-2/3 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    disabled
                />
            </div>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-1/12">Trigger:</span>
                <div className="flex-1 p-2 border rounded dark:border-gray-600 w-11/12">
                    {(workflow.Triggers || []).map((trigger, index) => (
                        <div key={`trigger-${index}`}>
                            <div className="grid grid-cols-5 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Trigger Type
                                    </label>
                                    <select
                                        value="Match tags"
                                        disabled
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 opacity-75"
                                    >
                                        <option value="Match tags">Match tags</option>
                                    </select>
                                </div>

                                <div className="col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Trigger Tags (Or)
                                    </label>
                                    <ReactTags
                                        selected={(() => {
                                            try {
                                                const parsed = JSON.parse(trigger.MatchData || '[]');
                                                return Array.isArray(parsed) ? parsed.map((tagName, i) => ({
                                                    id: i.toString(),
                                                    name: tagName,
                                                    label: tagName,
                                                    value: tagName
                                                })) : [];
                                            } catch {
                                                return [];
                                            }
                                        })()}
                                        suggestions={(() => {
                                            const selectedTags = new Set(JSON.parse(trigger.MatchData || '[]'));
                                            return availableTags
                                                .filter(tag => !selectedTags.has(tag.name))
                                                .map(tag => ({
                                                    id: tag.id,
                                                    name: tag.name,
                                                    label: tag.name,
                                                    value: tag.name,
                                                }));
                                        })()}
                                        onAdd={(tag) => {
                                            try {
                                                const currentTags = JSON.parse(trigger.MatchData || '[]');
                                                if (!currentTags.includes(tag.value)) {
                                                    updateTrigger(index, {
                                                        MatchAction: 'Match tags',
                                                        MatchData: JSON.stringify([...currentTags, tag.value])
                                                    });
                                                }
                                            } catch {
                                                updateTrigger(index, {
                                                    MatchAction: 'Match tags',
                                                    MatchData: JSON.stringify([tag.value])
                                                });
                                            }
                                        }}
                                        onDelete={(tagIndex) => {
                                            try {
                                                const currentTags = JSON.parse(trigger.MatchData || '[]');
                                                currentTags.splice(tagIndex, 1);
                                                updateTrigger(index, {
                                                    MatchAction: 'Match tags',
                                                    MatchData: JSON.stringify(currentTags)
                                                });
                                            } catch {
                                                updateTrigger(index, {
                                                    MatchAction: 'Match tags',
                                                    MatchData: '[]'
                                                });
                                            }
                                        }}
                                        allowNew={false}
                                        placeholderText="Add trigger tags"
                                        classNames={{
                                            root: "react-tags border dark:bg-gray-800",
                                            rootIsActive: "is-active",
                                            rootIsDisabled: "is-disabled",
                                            rootIsInvalid: "is-invalid",
                                            label: "react-tags__label",
                                            tagList: "react-tags__list",
                                            tagListItem: "react-tags__list-item",
                                            tag: "react-tags__tag dark:bg-blue-900 dark:text-blue-200",
                                            tagName: "react-tags__tag-name",
                                            comboBox: "react-tags__combobox dark:bg-gray-700 dark:text-gray-200",
                                            input: "react-tags__combobox-input dark:bg-gray-700 dark:text-gray-200",
                                            listBox: "react-tags__listbox dark:bg-gray-700 dark:text-gray-200",
                                            option: "react-tags__listbox-option dark:bg-gray-700 dark:text-gray-200 hover:bg-blue-500 dark:hover:bg-blue-800",
                                            optionIsActive: "is-active",
                                            highlight: "react-tags__highlight dark:bg-gray-800",
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-1/12">Trigger:</span>
                <div className="flex-1 p-2 border rounded dark:border-gray-600 w-11/12">
                    <div className="grid grid-cols-5 gap-4 p-1 items-start">
                        <div className="col-span-2">
                            <select
                                value="Manual Review"
                                disabled
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 opacity-75"
                            >
                                <option value="Manual Review">Manual Review</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowManualCard;