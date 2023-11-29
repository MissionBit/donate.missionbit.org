import { NextPage, GetServerSideProps } from "next";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Layout,
  getLayoutStaticProps,
  LayoutStaticProps,
} from "components/Layout";
import Head from "next/head";
import Error404 from "pages/404";

import { BalanceTransactionBatch } from "src/stripeBalanceTransactions";
import { makeStyles } from "@material-ui/core/styles";

import getBalanceModifications, {
  BalanceModifications,
} from "src/googleBalanceModifications";

import Box from "@material-ui/core/Box";

import Typography from "@material-ui/core/Typography";
import { useElapsedTime } from "use-elapsed-time";
import LinearProgress from "@material-ui/core/LinearProgress";
import Paper from "@material-ui/core/Paper";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Collapse from "@material-ui/core/Collapse";
import Link from "@material-ui/core/Link";
import { getOrigin } from "src/absoluteUrl";
import {
  DonatePrefill,
  parseDonatePrefill,
} from "components/donate/DonateCard";
import { ssBrand } from "src/colors";
import Logo from "components/MissionBitLogo";
import dollars from "src/dollars";
import liveTheme from "src/liveTheme";
import Embellishment from "public/images/Embellishment_2_Teal_RGB.png";
import getBatch from "src/getBatch";

dayjs.extend(relativeTime);

const backgroundColor = ssBrand.purple;
const BAR_COLOR = ssBrand.orange;
const BAR_BACKGROUND = ssBrand.purple;
const PROGRESS_BORDER = ssBrand.white;
const PROGRESS_WRAPPER_BORDER = ssBrand.mediumGrey;

function easeOutCubic(t: number, b: number, c: number, d: number): number {
  const x = t / d - 1;
  return c * (x * x * x + 1) + b;
}

const VERTICAL_BREAK = "sm";
const HIGH_BREAK = 1900;

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor,
    display: "grid",
    height: "100vh",
    maxHeight: "var(--document-height, 100vh)",
    gridTemplateColumns: "2fr 1fr",
    gridTemplateRows: "1fr min-content",
    gridTemplateAreas: `
      "goal donors"
      "banner banner"
    `,
    [theme.breakpoints.down(VERTICAL_BREAK)]: {
      gridTemplateColumns: "1fr",
      gridTemplateAreas: `
        "goal"
        "donors"
      `,
    },
  },
  donateBanner: {
    gridArea: "banner",
    backgroundColor: ssBrand.black,
    padding: theme.spacing(2, 2),
    [theme.breakpoints.down(VERTICAL_BREAK)]: {
      display: "none",
    },
  },
  donateBannerText: {
    animation: `10s ${theme.transitions.easing.easeInOut} infinite $pulse`,
    color: ssBrand.white,
    [theme.breakpoints.down(HIGH_BREAK)]: {
      fontSize: "3rem",
    },
  },
  donorBubble: {
    display: "grid",
    padding: theme.spacing(2),
    margin: theme.spacing(2),
    gridAutoColumns: "auto",
    gridTemplateAreas: `
      "name amount"
    `,
  },
  donorAmount: {
    ...theme.typography.h3,
    gridArea: "amount",
    textAlign: "right",
    alignSelf: "center",
    [theme.breakpoints.down(HIGH_BREAK)]: {
      fontSize: "2rem",
    },
  },
  donorName: {
    gridArea: "name",
    ...theme.typography.h4,
    alignSelf: "center",
    [theme.breakpoints.down(HIGH_BREAK)]: {
      fontSize: "1.5rem",
    },
  },
  progressWrapper: {
    border: `1px solid ${PROGRESS_WRAPPER_BORDER}`,
    borderRadius: "0.5rem",
  },
  progressContainer: {
    [theme.breakpoints.down(VERTICAL_BREAK)]: {
      flexDirection: "column",
    },
  },
  progressText: {
    fontSize: "7rem",
    flex: 1,
    display: "grid",
    gridTemplateColumns: "1fr 0.1fr 1fr",
    [theme.breakpoints.down(HIGH_BREAK)]: {
      fontSize: "4rem",
    },
  },
  progressTotal: {
    textAlign: "left",
  },
  progressOf: {
    textAlign: "center",
    fontSize: "5rem",
    padding: theme.spacing(0, 2),
    alignSelf: "center",
    [theme.breakpoints.down(HIGH_BREAK)]: {
      fontSize: "3rem",
    },
  },
  progressGoal: {
    textAlign: "right",
  },
  donorCount: {
    textAlign: "right",
    alignSelf: "center",
    fontSize: theme.typography.h2.fontSize,
    [theme.breakpoints.down(HIGH_BREAK)]: {
      fontSize: "3rem",
    },
  },
  progress: {
    width: "100%",
    borderRadius: "0.5rem",
    border: `2px solid ${PROGRESS_BORDER}`,
    height: theme.spacing(8),
  },
  "@keyframes pulse": {
    "0%": {
      transform: "scale(1)",
    },
    "60%": {
      transform: "scale(1)",
    },
    "80%": {
      transform: "scale(1.05)",
    },
    "100%": {
      transform: "scale(1)",
    },
  },
  donors: {
    gridArea: "donors",
    overflow: "hidden",
  },
  embellishment: {
    position: "absolute",
    left: Embellishment.width * 0,
    bottom: Embellishment.width * -0.15,
    width: Embellishment.width * 0.6,
    height: Embellishment.height * 0.6,
  },
  goal: {
    gridArea: "goal",
    padding: theme.spacing(2),
    position: "relative",
    justifyContent: "center",
    [":where(& > *)"]: {
      position: "relative",
    },
  },
  goalName: {
    display: "none",
    paddingTop: theme.spacing(1),
    fontSize: theme.typography.h2.fontSize,
    fontWeight: 700,
    textAlign: "center",
  },
  logo: {
    width: "50%",
    objectFit: "contain",
    marginBottom: theme.spacing(2),
    color: ssBrand.white,
  },
  barColorPrimary: {
    backgroundColor: BAR_COLOR,
  },
  colorPrimary: {
    backgroundColor: BAR_BACKGROUND,
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

export interface PageProps extends LayoutStaticProps {
  readonly batch?: BalanceTransactionBatch;
  readonly modifications?: BalanceModifications;
  readonly prefill?: DonatePrefill;
}

function mergeBatch(
  current: BalanceTransactionBatch,
  update: BalanceTransactionBatch,
): BalanceTransactionBatch {
  const ids = new Set<string>(update.transactions.map((txn) => txn.id));
  const transactions = [
    ...update.transactions,
    ...current.transactions.filter((txn) => !ids.has(txn.id)),
  ];
  return { ...update, transactions };
}

function addSimulatedTransaction(
  batch: BalanceTransactionBatch,
): BalanceTransactionBatch {
  const created = dayjs().unix();
  const item = {
    ...(batch.transactions[
      Math.floor(Math.random() * batch.transactions.length)
    ] ?? {
      name: "Anonymous",
      amount: 100 * (1 + Math.floor(100 * Math.random())),
      subscription: false,
      type: "direct",
    }),
    id: `fake-${created}`,
    created,
  };
  return {
    ...batch,
    pollTime: created,
    transactions: [item, ...batch.transactions],
  };
}

export interface BalanceProps {
  readonly batch: BalanceTransactionBatch;
  readonly modifications: BalanceModifications;
}

interface DashboardProps extends BalanceProps {
  readonly simulate: boolean;
}

export interface LiveDashboardProps {
  readonly goalName: string;
  readonly goalCents: number;
  readonly campaignCopy: string;
  readonly donors: readonly CommonTransaction[];
  readonly donorCount: number;
  readonly totalCents: number;
  readonly errors: number;
}

export function useLiveDashboard(
  initial: BalanceProps,
  simulate = false,
): LiveDashboardProps {
  const [batch, setBatch] = useState(initial.batch);
  const [modifications, setModifications] = useState(initial.modifications);
  const [errors, setErrors] = useState(0);
  useEffect(() => {
    let mounted = true;
    (async () => {
      await new Promise((res) => setTimeout(res, 10 * 1000));
      if (!mounted) {
        return;
      }
      try {
        const res = await fetch(
          `/api/balance-transactions?created=${batch.created}`,
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
  useEffect(() => {
    if (!simulate) {
      return;
    }
    const interval = setInterval(() => setBatch(addSimulatedTransaction), 1000);
    return () => clearInterval(interval);
  }, [simulate]);

  const batchTransactions = useMemo(() => {
    const ignored = new Set(
      modifications.ignoredTransactions.map((ignored) => ignored.id),
    );
    return batch.transactions.filter((txn) => !ignored.has(txn.id));
  }, [batch.transactions, modifications.ignoredTransactions]);
  const donors = useMemo(() => {
    const donors: CommonTransaction[] = [];
    for (const txn of batchTransactions) {
      donors.push({
        name: txn.name ?? "Anonymous",
        created: txn.created,
        amount: txn.amount,
      });
    }
    for (const txn of modifications.transactions) {
      donors.push({
        name: txn.name ?? "Anonymous",
        created: txn.created,
        amount: txn.amount,
      });
    }
    donors.sort((a, b) => b.created - a.created);
    return donors;
  }, [batchTransactions, modifications.transactions]);
  const totalCents = batchTransactions.reduce(
    (amount, txn) => amount + txn.amount,
    modifications.transactions.reduce((amount, txn) => amount + txn.amount, 0),
  );
  const goalCents =
    modifications.allGoalCents.find((v) => v >= totalCents) ??
    modifications.allGoalCents[modifications.allGoalCents.length - 1] ??
    modifications.goalCents;
  return {
    goalName: modifications.goalName,
    goalCents,
    campaignCopy: modifications.campaignCopy,
    donors,
    donorCount: donors.length,
    totalCents,
    errors,
  };
}

const LiveDashboard: React.FC<DashboardProps> = (initial) => {
  const [simulate, setSimulate] = useState(false);
  const classes = useStyles();
  const { goalName, goalCents, donors, donorCount, totalCents } =
    useLiveDashboard(initial, simulate);

  const toggleSimulate = useCallback(() => {
    setSimulate((simulate) => initial.simulate && !simulate);
  }, [initial.simulate, setSimulate]);

  return (
    <Box className={classes.root} onClick={toggleSimulate}>
      <Goal
        goalName={goalName}
        goalCents={goalCents}
        totalCents={totalCents}
        donorCount={donorCount}
      />
      <Donors transactions={donors} />
      <DonateBanner />
    </Box>
  );
};

interface CommonTransaction {
  name: string;
  amount: number;
  created: number;
}

interface GoalValues {
  readonly totalCents: number;
  readonly goalCents: number;
}

function goalDuration({ totalCents, goalCents }: GoalValues): number {
  return Math.max(1, 6 * Math.min(1.0, totalCents / goalCents));
}

function easeGoal(
  elapsedTime: number,
  duration: number,
  start: GoalValues,
  goal: GoalValues,
): GoalValues {
  return {
    totalCents: easeOutCubic(
      elapsedTime,
      start.totalCents,
      goal.totalCents - start.totalCents,
      duration,
    ),
    goalCents: easeOutCubic(
      elapsedTime,
      start.goalCents,
      goal.goalCents - start.goalCents,
      duration,
    ),
  };
}

function goalEq(a: GoalValues, b: GoalValues): boolean {
  return a.goalCents === b.goalCents && a.totalCents === b.totalCents;
}

export function useAnimatedGoal(goal: GoalValues): GoalValues {
  const prevGoalRef = useRef(goal);
  const startGoalRef = useRef({ ...goal, totalCents: 0 });
  const animGoalRef = useRef(startGoalRef.current);
  const duration = goalDuration(goal);
  const isPlaying = !goalEq(goal, startGoalRef.current);
  const { elapsedTime, reset } = useElapsedTime({
    isPlaying,
    duration,
  });
  useEffect(() => {
    reset();
  }, [reset, goal.goalCents, goal.totalCents]);
  const didReset = !goalEq(prevGoalRef.current, goal);
  if (didReset) {
    prevGoalRef.current = goal;
    startGoalRef.current = animGoalRef.current;
  } else if (elapsedTime >= duration) {
    startGoalRef.current = goal;
  }
  animGoalRef.current = easeGoal(
    elapsedTime,
    duration,
    startGoalRef.current,
    prevGoalRef.current,
  );
  return animGoalRef.current;
}

const Goal: React.FC<{
  readonly goalName: string;
  readonly goalCents: number;
  readonly totalCents: number;
  readonly donorCount: number;
}> = ({ donorCount, goalName, ...goalValues }) => {
  const classes = useStyles();
  const { goalCents, totalCents } = useAnimatedGoal(goalValues);
  return (
    <Box
      display="flex"
      alignItems="center"
      flexDirection="column"
      className={classes.goal}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={Embellishment.src} alt="" className={classes.embellishment} />
      <Logo className={classes.logo} />
      <Box
        display="flex"
        width="100%"
        justifyContent="center"
        className={classes.progressContainer}
      >
        <Typography className={classes.progressText}>
          <strong className={classes.progressTotal}>
            {dollars(totalCents)}
          </strong>
          <span className={classes.progressOf}>of</span>
          <span className={classes.progressGoal}>{dollars(goalCents)}</span>
        </Typography>
      </Box>
      <Box
        display="flex"
        alignItems="center"
        width="100%"
        className={classes.progressWrapper}
      >
        <LinearProgress
          className={classes.progress}
          classes={{
            colorPrimary: classes.colorPrimary,
            barColorPrimary: classes.barColorPrimary,
          }}
          color="primary"
          variant="determinate"
          value={Math.min(100, 100 * (totalCents / goalCents))}
        />
      </Box>
      <Box
        display="flex"
        width="100%"
        justifyContent="flex-end"
        className={classes.progressContainer}
      >
        <Typography className={classes.donorCount}>
          {donorCount} {donorCount === 1 ? "Donor" : "Donors"}
        </Typography>
      </Box>
      <Typography className={classes.goalName}>{goalName}</Typography>
    </Box>
  );
};

const Donors: React.FC<{
  readonly transactions: readonly CommonTransaction[];
}> = ({ transactions }) => {
  const classes = useStyles();
  const [appear, setAppear] = useState(false);
  useEffect(() => {
    setAppear(true);
  }, []);
  return (
    <Box className={classes.donors}>
      {transactions.slice(0, 15).map(({ name, amount, created }) => (
        <Collapse
          key={`${name}-${amount}-${created}`}
          timeout={300}
          appear={appear}
          in={true}
        >
          <Paper elevation={2} square={false} className={classes.donorBubble}>
            <Typography className={classes.donorName}>{name}</Typography>
            <Typography className={classes.donorAmount}>
              {dollars(amount)}
            </Typography>
          </Paper>
        </Collapse>
      ))}
    </Box>
  );
};

const DonateBanner: React.FC<{}> = () => {
  const classes = useStyles();
  return (
    <Link href="/donate" className={classes.donateBanner}>
      <Typography
        align="center"
        variant="h1"
        className={classes.donateBannerText}
      >
        donate.missionbit.org
      </Typography>
    </Link>
  );
};

const Page: NextPage<PageProps> = ({ batch, modifications, ...props }) => {
  if (batch === undefined || modifications === undefined) {
    return <Error404 {...props} />;
  } else {
    return (
      <Layout
        {...props}
        theme={liveTheme}
        requireDocumentSize={true}
        title={modifications.goalName}
      >
        <Head>
          <meta name="robots" content="noindex" />
        </Head>
        <LiveDashboard
          batch={batch}
          modifications={modifications}
          simulate={process.env.NODE_ENV === "development"}
        />
      </Layout>
    );
  }
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx,
) => {
  if (typeof window !== "undefined") {
    throw new Error("Must be called server-side");
  }
  const [layoutProps, { startTimestamp }] = await Promise.all([
    getLayoutStaticProps(),
    getBalanceModifications(),
  ]);
  const { batch, modifications } = await getBatch(startTimestamp);
  return {
    props: {
      origin: getOrigin(ctx.req.headers.origin),
      ...layoutProps,
      batch,
      modifications,
      prefill: parseDonatePrefill({ ...ctx.query, ...(ctx.params ?? {}) }),
    },
  };
};

export default Page;
