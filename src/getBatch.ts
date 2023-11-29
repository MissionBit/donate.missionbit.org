import {
  BalanceTransaction,
  BalanceTransactionBatch,
  getBalanceTransactions,
} from "./stripeBalanceTransactions";
import getBalanceModifications from "./googleBalanceModifications";
import getGivebutterBalanceTransactions from "./givebutter/getGivebutterBalanceTransactions";

function addBatchTransactions(
  batch: BalanceTransactionBatch,
  transactions: readonly BalanceTransaction[],
): BalanceTransactionBatch {
  return {
    ...batch,
    transactions: [...batch.transactions, ...transactions].sort(
      (a, b) => a.created - b.created,
    ),
  };
}

export async function getBatch(created: number) {
  const [batch, givebutterTransactions, modifications] = await Promise.all([
    getBalanceTransactions(created),
    getGivebutterBalanceTransactions(created),
    getBalanceModifications(),
  ]);
  return {
    batch: addBatchTransactions(batch, givebutterTransactions),
    modifications,
  };
}

export default getBatch;
