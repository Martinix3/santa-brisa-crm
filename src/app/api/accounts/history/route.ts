
import { NextResponse } from 'next/server';
import { getInteractionsForAccountFS } from '@/services/order-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    const accountName = searchParams.get('accountName');

    if (!accountId || !accountName) {
      return NextResponse.json({ error: 'Missing accountId or accountName' }, { status: 400 });
    }

    const data = await getInteractionsForAccountFS(accountId, accountName);
    
    // Ensure that even if data is null or undefined, we return a valid JSON array.
    const responseData = data || [];
    const serializableData = JSON.parse(JSON.stringify(responseData));
    
    return NextResponse.json(serializableData);

  } catch (error: any) {
    console.error(`[API_HISTORY_ERROR] for accountId ${new URL(req.url).searchParams.get('accountId')}:`, error);
    return NextResponse.json({ error: 'Failed to fetch account history.', details: error.message }, { status: 500 });
  }
}
