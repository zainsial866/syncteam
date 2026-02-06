// src/steps/manager-approval.step.js

/**
 * Manager Approval NOOP Step
 * Represents the manual approval phase in the project workflow.
 */
export const config = {
    type: 'noop',
    name: 'ManagerApproval',
    description: 'Project manager reviews and approves the task synchronization',
    virtualSubscribes: ['sync.requested'],
    virtualEmits: ['sync.approved', 'sync.rejected'],
    flows: ['user-management']
};

// No handler needed for NOOP steps
