// debug-cartera.ts

import { getAccountsFS } from './src/services/account-service';
import { getInteractionsFS } from './src/services/interaction-service';

async function debug() {
  const accountId = 'REPLACE_WITH_ACCOUNT_ID'; // TODO: Replace with a real account ID for debugging
  const accounts = await getAccountsFS();
  const account = accounts.find(a => a.id === accountId);
  const interactions = await getInteractionsFS();
  const its = interactions.filter(i => i.accountId === accountId);
  process.exit(0);
}

debug().catch(err => {
  console.error(err);
  process.exit(1);
});
