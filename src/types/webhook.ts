import { z } from '@hono/zod-openapi'

// Define the webhook schema with inline custom_data schema
export const WebhookSchema = z.object({
    id: z.string().uuid().optional().openapi({
        example: '9cd1d9fa-d2d6-4f45-8b6d-b603994cd8f9'
    }),
    user: z.string().min(1).openapi({
        example: 'jappleseed'
    }),
    machine: z.string().min(1).openapi({
        example: 'A7B45C3D-8F12-4E56-9D23-F1A8B7C6D5E4'
    }),
    event: z.enum(['corp.sap.privileges.granted', 'corp.sap.privileges.revoked']).openapi({
        example: 'corp.sap.privileges.granted'
    }),
    reason: z.string().min(1).openapi({
        example: 'Installing software'
    }),
    admin: z.boolean().openapi({
        example: true
    }),
    timestamp: z.string().datetime().openapi({
        example: '2025-04-25T12:23:30Z'
    }),
    expires: z.union([z.string().datetime(), z.literal('')]).optional().openapi({
        example: '2025-04-25T12:28:30Z'
    }),
    received_at: z.string().datetime().optional().openapi({
        example: '2025-04-25T12:23:32.092Z'
    }),
    custom_data: z.record(z.any()).optional().openapi({ // Any key-value pairs, entirely optional
        example: {
            department: 'Developer',
            name: 'My awesome Mac',
            os_version: '15.4.1',
            serial: 'XYZ1234567'
        }
    }),
    client_version: z.number().int().optional().openapi({
        example: 479
    }),
    platform: z.string().min(1).optional().openapi({
        example: 'macOS'
    }),
    cf_network_version: z.string().optional().openapi({
        example: '3826.500.111.1.1'
    }),
    os_version: z.string().optional().openapi({
        example: '24.4.0'
    }),
    delayed: z.boolean().optional().default(false).openapi({
        example: false
    }),
    created_at: z.string().datetime().optional().openapi({
        example: '2025-04-25T12:23:32.092Z'
    })
})

export type Webhook = z.infer<typeof WebhookSchema>

// For database operations (where boolean is stored as INTEGER)
export interface WebhookDB extends Omit<Webhook, 'admin' | 'delayed' | 'custom_data'> {
    admin: number
    delayed: number
    custom_data: string // JSON string in DB
}