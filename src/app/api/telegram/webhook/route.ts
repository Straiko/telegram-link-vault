import { NextRequest, NextResponse } from 'next/server';
import { TelegramUpdateSchema } from '@/domain/link.schema';
import { LinkOrchestratorService } from '@/services/link-orchestrator.service';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (expectedSecret && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    console.error({ err }, 'Invalid JSON in Telegram webhook body');
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = TelegramUpdateSchema.safeParse(body);
  if (!validation.success) {
    console.warn({ issues: validation.error.issues }, 'Telegram webhook schema validation failed');
    return NextResponse.json({ error: 'Schema validation error', details: validation.error.format() }, { status: 422 });
  }

  const result = await LinkOrchestratorService.processTelegramUpdate(validation.data);
  if (!result.success) {
    console.error({ error: result.error }, 'Error processing Telegram update in orchestrator');
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, savedCount: result.data.length });
}
