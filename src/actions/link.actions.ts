'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { LinkRepository } from '@/data/link.repository';
import { LinkItem, Result, Category } from '@/domain/link.types';
import { CategoryEnum } from '@/domain/link.schema';
import { AiClassifierService } from '@/services/ai-classifier.service';
import { TelegramService } from '@/services/telegram.service';

const CreatePostSchema = z.object({
  url: z.string().url('A valid URL is required (must start with http:// or https://)'),
  title: z.string().optional().default(''),
  content: z.string().optional().default(''),
  category: CategoryEnum.optional(),
  tags: z.string().optional().default('')
});

export async function toggleReadAction(id: number): Promise<Result<LinkItem>> {
  if (typeof id !== 'number' || id <= 0) {
    return { success: false, error: 'Invalid link ID provided' };
  }

  const updated = LinkRepository.toggleRead(id);
  if (!updated) {
    return { success: false, error: 'Link not found' };
  }

  revalidatePath('/');
  return { success: true, data: updated };
}

export async function deleteLinkAction(id: number): Promise<Result<{ id: number }>> {
  if (typeof id !== 'number' || id <= 0) {
    return { success: false, error: 'Invalid link ID provided' };
  }

  const deleted = LinkRepository.deleteById(id);
  if (!deleted) {
    return { success: false, error: 'Could not delete link' };
  }

  revalidatePath('/');
  return { success: true, data: { id } };
}

export async function createPostAction(formData: FormData): Promise<Result<LinkItem>> {
  const rawUrl = formData.get('url');
  const rawTitle = formData.get('title');
  const rawContent = formData.get('content');
  const rawCategory = formData.get('category');
  const rawTags = formData.get('tags');

  const validation = CreatePostSchema.safeParse({
    url: rawUrl,
    title: rawTitle || '',
    content: rawContent || '',
    category: rawCategory || undefined,
    tags: rawTags || ''
  });

  if (!validation.success) {
    const errorMsg = validation.error.issues.map((i) => i.message).join(', ');
    return { success: false, error: errorMsg };
  }

  const { url, title, content, category, tags: tagsStr } = validation.data;
  const cleanedUrl = TelegramService.cleanUrl(url);

  // Parse tags
  const manualTags = tagsStr
    ? tagsStr
        .split(/[\s,]+/)
        .map((t) => t.replace(/^#/, '').trim())
        .filter((t) => t.length > 0)
    : [];

  // Run AI classification if category or tags missing
  let finalCategory = category;
  let finalTags = manualTags;
  let finalTitle = title;

  if (!finalCategory || finalTags.length === 0) {
    const aiResult = await AiClassifierService.classifyWithGroq(cleanedUrl, content);
    finalCategory = finalCategory || aiResult.category;
    if (finalTags.length === 0) {
      finalTags = aiResult.tags;
    }
    if (!finalTitle) {
      finalTitle = content ? content.split('\n')[0].slice(0, 100) : aiResult.summary;
    }
  }

  if (!finalTitle) {
    finalTitle = cleanedUrl;
  }

  const created = LinkRepository.create({
    url: cleanedUrl,
    title: finalTitle,
    snippet: content, // Complete unabbreviated post content
    category: finalCategory as Category,
    tags: finalTags,
    originalDate: new Date().toISOString()
  });

  revalidatePath('/');
  return { success: true, data: created };
}
