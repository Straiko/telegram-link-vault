import { z } from 'zod';

export const CategoryEnum = z.enum([
  'ai-models',
  'dev-tools',
  'articles',
  'gaming',
  'media',
  'apps',
  'telegram',
  'social',
  'utilities'
]);

export const IngestLinkSchema = z.object({
  url: z.string().url('Invalid URL format'),
  title: z.string().optional().default(''),
  snippet: z.string().optional().default(''),
  category: CategoryEnum.optional(),
  tags: z.array(z.string()).optional().default([]),
  originalDate: z.string().optional().default('')
});

export const TelegramEntitySchema = z.object({
  type: z.string(),
  offset: z.number(),
  length: z.number(),
  url: z.string().optional()
});

export const TelegramMessageSchema = z.object({
  message_id: z.number(),
  date: z.number(),
  text: z.string().optional(),
  caption: z.string().optional(),
  entities: z.array(TelegramEntitySchema).optional(),
  caption_entities: z.array(TelegramEntitySchema).optional(),
  chat: z.object({
    id: z.number(),
    title: z.string().optional(),
    username: z.string().optional()
  })
});

export const TelegramUpdateSchema = z.object({
  update_id: z.number(),
  message: TelegramMessageSchema.optional(),
  channel_post: TelegramMessageSchema.optional(),
  edited_message: TelegramMessageSchema.optional(),
  edited_channel_post: TelegramMessageSchema.optional()
});

export const LinkQuerySchema = z.object({
  query: z.string().optional().default(''),
  category: CategoryEnum.optional(),
  readStatus: z.enum(['all', 'read', 'unread']).optional().default('all'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50)
});

export type IngestLinkDto = z.infer<typeof IngestLinkSchema>;
export type TelegramUpdateDto = z.infer<typeof TelegramUpdateSchema>;
export type LinkQueryDto = z.infer<typeof LinkQuerySchema>;
