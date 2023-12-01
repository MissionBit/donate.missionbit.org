import { upsertBalanceModifications } from "src/googleBalanceModifications";

async function main() {
  await upsertBalanceModifications();
}
main();
