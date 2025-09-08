
import { NextResponse } from 'next/server';
import { getRecentHistoryByAccount } from '@/features/accounts/repo';
import { getAccountHistory } from '@/app/(app)/accounts/actions';


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('accountId');
  if (!accountId) {
    return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
  }
  const data = await getAccountHistory(accountId);
  return NextResponse.json(data);
}
