import { z } from 'zod';

// SyncTeam Live Updates Stream
export const config = {
    name: 'syncUpdates',
    schema: z.object({
        id: z.string(),
        type: z.enum(['TASK_CREATED', 'TASK_UPDATED', 'USER_LOGGED_IN']),
        data: z.any(),
        timestamp: z.string()
    }),
    baseConfig: {
        storageType: 'default'
    }
};
