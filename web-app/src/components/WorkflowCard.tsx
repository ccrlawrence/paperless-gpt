// WorkflowCard.tsx
import React, { useState } from 'react';
import { mdiDelete, mdiArrowUp, mdiArrowDown, mdiClose } from '@mdi/js';
import Icon from '@mdi/react';
import { TagOption, Workflow, WorkflowTrigger, WorkflowAction } from '../Workflows';
import { ReactTags, Tag } from "react-tag-autocomplete";

interface WorkflowCardProps {
    availableTags?: TagOption[];
    initialWorkflow: Workflow;
    onUpdate: (workflow: Workflow) => void;
    onDelete: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
}

const triggerTypes = [
    "Match tags"
] as const;
type TriggerType = typeof triggerTypes[number];

const actionTypes = [
    // "Manual Review",
    "Auto title",
    "Auto tag",
    "Auto OCR",
    "Apply tags"
] as const;
// type ActionType = typeof actionTypes[number];

const WorkflowCard: React.FC<WorkflowCardProps> = ({
    availableTags = [],
    initialWorkflow,
    onUpdate,
    onDelete,
    onMoveUp,
    onMoveDown,
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
    }

    const updateAction = (index: number, updates: Partial<WorkflowAction>) => {
        const newWorkflow: Workflow = { ...workflow };
        newWorkflow.Actions[index] = {
            ...newWorkflow.Actions[index],
            ...updates,
            ActionData: updates.ActionData || '[]'
        };
        setWorkflow(newWorkflow);
        onUpdate(newWorkflow);
    };

    const addAction = () => {
        const newWorkflow: Workflow = {
            ...workflow,
            Actions: [
                ...(workflow.Actions || []),
                {
                    ExecutionOrder: (workflow.Actions || []).length,
                    ActionType: actionTypes[0],
                    ActionData: '[]'
                }
            ]
        };
        setWorkflow(newWorkflow);
        onUpdate(newWorkflow);
    };

    const deleteAction = (index: number) => {
        console.log('deleteAction', index);
        console.log('workflow', workflow);
        const newWorkflow: Workflow = { ...workflow };
        newWorkflow.Actions.splice(index, 1);
        setWorkflow(newWorkflow);
        onUpdate(newWorkflow);
        console.log('deleteAction', index);
        console.log('New workflow', newWorkflow);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flow-root mb-4">
                <div className="w-2/3 float-left">
                    <input
                        type="text"
                        value={workflow.Name}
                        onChange={(e) => { 
                            const updatedWorkflow = { ...workflow, Name: e.target.value };
                            setWorkflow(updatedWorkflow);
                            onUpdate(updatedWorkflow); 
                        }}
                        placeholder="Workflow Name"
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    />
                </div>
                <div className="float-right">
                    <button
                        onClick={onMoveUp}
                        disabled={!onMoveUp}
                        className={`p-2 border rounded mr-1 ${onMoveUp
                            ? 'text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300'
                            : 'text-gray-300 dark:text-gray-600 opacity-50'
                            }`}
                        title="Move up"
                    >
                        <Icon path={mdiArrowUp} size={1} />
                    </button>
                    <button
                        onClick={onMoveDown}
                        disabled={!onMoveDown}
                        className={`p-2 border rounded mr-3 ${onMoveDown
                            ? 'text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300'
                            : 'text-gray-300 dark:text-gray-600 opacity-50'
                            }`}
                        title="Move up"
                    >
                        <Icon path={mdiArrowDown} size={1} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 border rounded text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete workflow"
                    >
                        <Icon path={mdiDelete} size={1} />
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-1/12">Triggers:</span>
                <div className="flex-1 p-2 border rounded dark:border-gray-600 w-11/12">
                    {(workflow.Triggers || []).map((trigger, index) => {
                        return (
                            <div key={`trigger-${index}`}>
                                <div className="grid grid-cols-5 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Trigger Type
                                        </label>
                                        <select
                                            value={trigger.MatchAction}
                                            onChange={(e) => updateTrigger(index, { MatchAction: e.target.value as TriggerType })}
                                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                                        >
                                            {triggerTypes.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Trigger Tags
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
                                            onAdd={(tag: Tag) => {
                                                try {
                                                    const currentTags = JSON.parse(trigger.MatchData || '[]');
                                                    if (!currentTags.includes(tag.value)) {
                                                        updateTrigger(index, {
                                                            MatchAction: trigger.MatchAction,
                                                            MatchData: JSON.stringify([...currentTags, tag.value])
                                                        });
                                                    }
                                                } catch {
                                                    updateTrigger(index, {
                                                        MatchAction: trigger.MatchAction,
                                                        MatchData: JSON.stringify([tag.value])
                                                    });
                                                }
                                            }}
                                            onDelete={(tagIndex) => {
                                                try {
                                                    const currentTags = JSON.parse(trigger.MatchData || '[]');
                                                    currentTags.splice(tagIndex, 1);
                                                    updateTrigger(index, {
                                                        MatchAction: trigger.MatchAction,
                                                        MatchData: JSON.stringify(currentTags)
                                                    });
                                                } catch {
                                                    updateTrigger(index, {
                                                        MatchAction: trigger.MatchAction,
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
                        )
                    })}
                </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-1/12">Actions:</span>
                <div className="flex-1 p-2 border rounded dark:border-gray-600 w-11/12">
                    {(workflow.Actions || []).map((action, index) => (
                        <div key={`action-${index}`} className="flex gap-4 items-center"> {/* Changed items-start to items-center */}
                            <div className="flex-1">
                                <div className="grid grid-cols-5 gap-4 p-1 items-start">
                                    <div className="col-span-2 flex gap-2">
                                        <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 h-10 w-4 flex items-center">
                                            {index + 1}.
                                        </span>
                                        <select
                                            value={action.ActionType}
                                            onChange={(e) => updateAction(index, { ActionType: e.target.value })}
                                            className="flex-1 h-10 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                                        >
                                            {actionTypes.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {action.ActionType === "Apply tags" && (
                                        <div className="col-span-3 min-h-[2.5rem]">
                                            <ReactTags
                                                selected={(() => {
                                                    try {
                                                        const parsed = JSON.parse(action.ActionData || '[]');
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
                                                    const selectedTags = new Set(JSON.parse(action.ActionData || '[]'));
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
                                                        const currentTags = JSON.parse(action.ActionData || '[]');
                                                        if (!currentTags.includes(tag.value)) {
                                                            updateAction(index, {
                                                                ActionData: JSON.stringify([...currentTags, tag.value])
                                                            });
                                                        }
                                                    } catch {
                                                        updateAction(index, {
                                                            ActionData: JSON.stringify([tag.value])
                                                        });
                                                    }
                                                }}
                                                onDelete={(tagIndex) => {
                                                    try {
                                                        const currentTags = JSON.parse(action.ActionData || '[]');
                                                        currentTags.splice(tagIndex, 1);
                                                        updateAction(index, {
                                                            ActionData: JSON.stringify(currentTags)
                                                        });
                                                    } catch {
                                                        updateAction(index, {
                                                            ActionData: '[]'
                                                        });
                                                    }
                                                }}
                                                allowNew={false}
                                                placeholderText="Add tags to apply"
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
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => deleteAction(index)}
                                className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-2 self-center" /* Added self-center */
                                title="Delete action"
                            >
                                <Icon path={mdiClose} size={0.8} />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={addAction}
                        className="w-full mt-2 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Action
                    </button>

                </div>
            </div>
        </div>
    );
};

export default WorkflowCard;