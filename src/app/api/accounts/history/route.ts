
import { NextResponse } from 'next/server';
import { getRecentHistoryByAccount } from '@/features/accounts/repo';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
    }

    const data = await getRecentHistoryByAccount(accountId);
    
    // Ensure all data is serializable before sending
    const serializableData = JSON.parse(JSON.stringify(data));
    
    return NextResponse.json(serializableData);

  } catch (error: any) {
    console.error(`[API_HISTORY_ERROR] for accountId:`, error);
    return NextResponse.json({ error: 'Failed to fetch account history.', details: error.message }, { status: 500 });
  }
}
