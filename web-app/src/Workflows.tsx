// Workflows.tsx
import WorkflowCard from './components/WorkflowCard';
import WorkflowManualCard from './components/WorkflowManualCard';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export interface TagOption {
  id: number;
  name: string;
}

export interface WorkflowTrigger {
  ID?: number;
  MatchAction: string;
  MatchData: string; // JSON string of tags array at the moment
}

export interface WorkflowAction {
  ID?: number;
  ExecutionOrder: number;
  ActionType: string;
  ActionData: string; // JSON string of data
}

export interface Workflow {
  ID: number;
  Name: string;
  RunOrder: number;
  Triggers: WorkflowTrigger[];
  Actions: WorkflowAction[];
  CreatedAt?: string;
}

const getNextTemporaryId = (existingWorkflows: Workflow[]): number => {
  if (!existingWorkflows?.length) {
    return 0;
  }
  console.log(-1, ...existingWorkflows.map(w => w.ID));
  const nextTempId = Math.max(-1, ...existingWorkflows.map(w => w.ID));
  return nextTempId + 1;
};

// Add constant for manual workflow ID
const MANUAL_WORKFLOW_RUN_ORDER = -1;

// Add function to create manual workflow
const createManualWorkflow = (): Workflow => ({
  ID: MANUAL_WORKFLOW_RUN_ORDER,
  Name: 'Manual Review Workflow',
  RunOrder: MANUAL_WORKFLOW_RUN_ORDER,
  Triggers: [{ 
    MatchAction: 'Match tags', 
    MatchData: '[]' 
  }],
  Actions: [{
    ExecutionOrder: 0,
    ActionType: 'Manual Review',
    ActionData: '[]'
  }]
});

const updateRunOrder = (workflows: Workflow[]): Workflow[] => {
  return workflows.map((workflow: Workflow, index: number) => ({
    ...workflow,
    RunOrder: index
  }));
}

const Workflows: React.FC = () => {
  const [manualWorkflow, setManualWorkflow] = useState<Workflow>(createManualWorkflow());
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchTags();
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/workflows');
      console.log(data);
      
      // Ensure manual workflow exists and is first
      const manualWorkflow = data.find((w : Workflow) => w.RunOrder === MANUAL_WORKFLOW_RUN_ORDER) || createManualWorkflow();
      const otherWorkflows = data.filter((w : Workflow) => w.RunOrder !== MANUAL_WORKFLOW_RUN_ORDER);
      
      console.log('Manual workflow:', manualWorkflow);
      console.log('Other workflows:', otherWorkflows);

      setManualWorkflow(manualWorkflow);
      setWorkflows(otherWorkflows);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else {
        setError('Failed to fetch workflows');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const { data } = await axios.get('/api/tags');
      const tagsArray: TagOption[] = Object.entries(data).map(([name, value]: [string, any]) => ({
        id: value || 0,
        name: name
      }));
      // Sort alphabetically
      tagsArray.sort((a, b) => a.name.localeCompare(b.name));
      setAvailableTags(tagsArray);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else {
        setError('Failed to fetch tags');
      }
    }
  };

  const handleManualWorkflowUpdate = (updatedWorkflow: Workflow) => {
    setManualWorkflow(updatedWorkflow);
    setHasChanges(true);
  }

  const handleWorkflowUpdate = (index: number, updatedWorkflow: Workflow) => {
    console.log(workflows);
    const newWorkflows = [...workflows];
    newWorkflows[index] = {
      ...updatedWorkflow,
      Actions: (updatedWorkflow?.Actions || []).map(action => ({
        ...action,
        actionData: action.ActionData || '[]'
      }))
    };
    setWorkflows(newWorkflows);
    console.log(newWorkflows);
    console.log(`${new Date().toISOString()}: Updated workflow id's: ${newWorkflows.map(w => w.ID)}`);
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    try {
      const workflowsToSave = [
        manualWorkflow,
        ...workflows,
      ];
      await axios.post('/api/workflows', workflowsToSave);
      await fetchWorkflows(); // Refresh from server
      setHasChanges(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else {
        setError('Failed to save workflows');
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      let newWorkflows = workflows.filter(w => w.ID !== id);
      newWorkflows = updateRunOrder(newWorkflows);
      setWorkflows(newWorkflows);
      setHasChanges(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workflow');
    }
  };

  const addNewWorkflow = () => {
    setWorkflows([...workflows, {
      ID: getNextTemporaryId(workflows),
      Name: '',
      RunOrder: workflows.length,
      Triggers: [{ MatchAction: "Match tags", MatchData: "[]" }],
      Actions: []
    }]);
    setHasChanges(true);
  };

  const handleMoveUp = (index: number) => {
    // Prevent moving up if it would go before manual workflow
    if (index <= 0) return;
    
    let newWorkflows = [...workflows];
    [newWorkflows[index - 1], newWorkflows[index]] = 
      [newWorkflows[index], newWorkflows[index - 1]];
    newWorkflows = updateRunOrder(newWorkflows);
    setWorkflows(newWorkflows);
    setHasChanges(true);
  };
  
  const handleMoveDown = (index: number) => {
    if (index >= workflows.length - 1) return;
    
    let newWorkflows = [...workflows];
    [newWorkflows[index], newWorkflows[index + 1]] = 
      [newWorkflows[index + 1], newWorkflows[index]];
    newWorkflows = updateRunOrder(newWorkflows);
    setWorkflows(newWorkflows);
    setHasChanges(true);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10 p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          Workflows
        </h1>
        <div className="flex gap-4">
          <button
            onClick={addNewWorkflow}
            className="bg-blue-600 text-white dark:bg-blue-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-900 focus:outline-none"
          >
            Add Workflow
          </button>
          <button
            onClick={handleSaveAll}
            className={`bg-green-600 text-white dark:bg-green-800 dark:text-gray-200 px-4 py-2 rounded ${hasChanges
              ? 'hover:bg-green-700 dark:hover:bg-green-900'
              : 'opacity-50'
              } focus:outline-none`}
            disabled={!hasChanges}
          >
            Save
          </button>
        </div>
      </div>
      <div className="container mx-auto px-4 py-2">
        <div className="grid gap-2 grid-cols-1">
        <WorkflowManualCard
          key={MANUAL_WORKFLOW_RUN_ORDER}
          availableTags={availableTags}
          initialWorkflow={manualWorkflow}
          onUpdate={(updatedWorkflow) => handleManualWorkflowUpdate(updatedWorkflow)}
        />

          {(workflows || []).map((workflow, index) => {
            console.log(workflows);
            console.log(workflow);
            return (
              <WorkflowCard
                key={workflow.ID}
                availableTags={availableTags}
                initialWorkflow={workflow}
                onUpdate={(updatedWorkflow) => handleWorkflowUpdate(index, updatedWorkflow)}
                onDelete={() => handleDelete(workflow.ID)}
                onMoveUp={index > 0 ? () => handleMoveUp(index) : undefined}
                onMoveDown={index < workflows.length - 1 ? () => handleMoveDown(index) : undefined}
              />
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default Workflows;
