'use server';

import { revalidatePath } from 'next/cache';
import { LinkRepository } from '@/data/link.repository';
import { LinkItem, Result } from '@/domain/link.types';
import { LinkOrchestratorService } from '@/services/link-orchestrator.service';

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

export async function addLinkAction(formData: FormData): Promise<Result<LinkItem>> {
  const url = formData.get('url');
  const snippet = formData.get('snippet');

  if (typeof url !== 'string' || !url.trim()) {
    return { success: false, error: 'URL is required' };
  }

  const snippetStr = typeof snippet === 'string' ? snippet.trim() : '';
  const result = await LinkOrchestratorService.ingestSingleLink(url.trim(), snippetStr);

  revalidatePath('/');
  return result;
}
