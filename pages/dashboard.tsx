import { NextPage, GetServerSideProps } from "next";
import React, { useEffect, useState } from "react";
import {
  Layout,
  getLayoutStaticProps,
  LayoutStaticProps,
} from "components/Layout";
import Head from "next/head";
import Error404 from "pages/404";

import getBalanceTransactions, {
  BalanceTransactionBatch,
} from "src/stripeBalanceTransactions";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import getBalanceModifications, {
  BalanceModifications,
  SPREADSHEET_ID,
} from "src/googleBalanceModifications";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import Container from "@material-ui/core/Container";
import dollars from "src/dollars";

const useStyles = makeStyles((theme) => ({
  table: {},
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gridGap: theme.spacing(1),
    padding: theme.spacing(1, 0),
  },
  ignored: {
    textDecoration: "line-through",
  },
}));

export const DateTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: false,
});

interface PageProps extends LayoutStaticProps {
  readonly batch?: BalanceTransactionBatch;
  readonly modifications?: BalanceModifications;
}

function mergeBatch(
  current: BalanceTransactionBatch,
  update: BalanceTransactionBatch
): BalanceTransactionBatch {
  const ids = new Set<string>(update.transactions.map((txn) => txn.id));
  const transactions = [
    ...update.transactions,
    ...current.transactions.filter((txn) => !ids.has(txn.id)),
  ];
  return { ...update, transactions };
}

interface DashboardProps {
  readonly batch: BalanceTransactionBatch;
  readonly modifications: BalanceModifications;
}

const DonateDashboard: React.FC<DashboardProps> = (initial) => {
  const [batch, setBatch] = useState(initial.batch);
  const [modifications, setModifications] = useState(initial.modifications);
  const [errors, setErrors] = useState(0);
  const ignored = new Set(
    modifications.ignoredTransactions.map((txn) => txn.id)
  );
  const classes = useStyles();
  useEffect(() => {
    let mounted = true;
    (async () => {
      await new Promise((res) => {
        setTimeout(res, 10 * 1000);
      });
      try {
        const res = await fetch(
          `/api/balance-transactions?created=${batch.created}`
        );
        if (!mounted) {
          return;
        }
        const json: DashboardProps = await res.json();
        if (!mounted) {
          return;
        }
        setBatch(mergeBatch(batch, json.batch));
        setModifications(json.modifications);
      } catch (error) {
        console.error(error);
        setErrors(errors + 1);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [batch, errors]);

  const { pollTime, transactions } = batch;
  const modificationTotal = modifications.transactions.reduce(
    (amount, txn) => amount + txn.amount,
    0
  );
  return (
    <Container>
      <Box className={classes.actions}>
        <Button
          target="_blank"
          variant="contained"
          color="secondary"
          rel="noopener noreferrer"
          href={`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`}
        >
          Adjustments Spreadsheet
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table
          className={classes.table}
          size="small"
          aria-label="Donation table"
        >
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell align="right">Amount</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>ID</TableCell>
            </TableRow>
            <TableRow>
              <TableCell />
              <TableCell align="right">
                {dollars(
                  transactions.reduce(
                    (amount, txn) =>
                      amount + (ignored.has(txn.id) ? 0 : txn.amount),
                    modificationTotal
                  )
                )}
              </TableCell>
              <TableCell colSpan={5}>
                Total as of {DateTimeFormat.format(pollTime * 1000)}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((txn, i) => (
              <TableRow
                key={txn.id}
                className={ignored.has(txn.id) ? classes.ignored : undefined}
              >
                <TableCell align="right">{transactions.length - i}</TableCell>
                <TableCell component="th" scope="row" align="right">
                  {dollars(txn.amount)}
                </TableCell>
                <TableCell>
                  {txn.subscription ? <em>Monthly</em> : "Once"}
                </TableCell>
                <TableCell>{txn.type}</TableCell>
                <TableCell>{txn.name}</TableCell>
                <TableCell>
                  {DateTimeFormat.format(txn.created * 1000)}
                </TableCell>
                <TableCell>{txn.id}</TableCell>
              </TableRow>
            ))}
            {modifications.transactions.map((txn, i) => (
              <TableRow key={i}>
                <TableCell align="right">{i}</TableCell>
                <TableCell component="th" scope="row" align="right">
                  {dollars(txn.amount)}
                </TableCell>
                <TableCell />
                <TableCell>Adjustment</TableCell>
                <TableCell>{txn.name}</TableCell>
                <TableCell>
                  {DateTimeFormat.format(modifications.pollTime * 1000)}
                </TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

const Page: NextPage<PageProps> = ({ batch, modifications, ...props }) => {
  if (batch === undefined || modifications === undefined) {
    return <Error404 {...props} />;
  } else {
    return (
      <Layout {...props} title="Mission Bit ??? Donation Dashboard">
        <Head>
          <meta name="robots" content="noindex" />
        </Head>
        <DonateDashboard batch={batch} modifications={modifications} />
      </Layout>
    );
  }
};

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  if (typeof window !== "undefined") {
    throw new Error("Must be called server-side");
  }
  const [layoutProps, modifications] = await Promise.all([
    getLayoutStaticProps(),
    getBalanceModifications(),
  ]);
  const batch = await getBalanceTransactions(modifications.startTimestamp);
  return {
    props: {
      ...layoutProps,
      batch,
      modifications,
    },
  };
};

export default Page;
