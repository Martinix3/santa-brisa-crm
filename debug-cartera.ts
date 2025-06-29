// debug-cartera.ts

import { getAccountsFS } from './src/services/account-service';
import { getInteractionsFS } from './src/services/interaction-service';

async function debug() {
  // NOTE TO USER: Replace this ID with the actual ID of the account you want to inspect.
  const accountId = 'EL_TIANGUIS_ID';

  // 1. Carga todas las cuentas e imprime sólo la que nos interesa
  const accounts = await getAccountsFS();
  const account = accounts.find(a => a.id === accountId);
  console.log('\n--- ACCOUNT RAW ---\n', JSON.stringify(account, null, 2));

  // 2. Carga todas las interacciones y filtra las de esa cuenta
  const interactions = await getInteractionsFS();
  const its = interactions.filter(i => i.accountId === accountId);
  console.log('\n--- INTERACTIONS RAW ---\n', JSON.stringify(its, null, 2));

  process.exit(0);
}

debug().catch(err => {
  console.error(err);
  process.exit(1);
});
