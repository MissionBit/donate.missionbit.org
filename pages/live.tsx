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
import getBalanceModifications, {
  BalanceModifications,
} from "src/googleBalanceModifications";
import { useElapsedTime } from "use-elapsed-time";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { getOrigin } from "src/absoluteUrl";
import {
  DonatePrefill,
  parseDonatePrefill,
} from "components/donate/DonateCard";
import Logo from "components/MissionBitLogo";
import dollars from "src/dollars";
import Embellishment from "public/images/Embellishment_2_Teal_RGB.png";
import getBatch from "src/getBatch";
import styles from "./live.module.scss";
import clsx from "clsx";

dayjs.extend(relativeTime);

function easeOutCubic(t: number, b: number, c: number, d: number): number {
  const x = t / d - 1;
  return c * (x * x * x + 1) + b;
}

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
  const { goalName, goalCents, donors, donorCount, totalCents } =
    useLiveDashboard(initial, simulate);

  const toggleSimulate = useCallback(() => {
    setSimulate((simulate) => initial.simulate && !simulate);
  }, [initial.simulate, setSimulate]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className={styles.root} onClick={toggleSimulate}>
      <Goal
        goalName={goalName}
        goalCents={goalCents}
        totalCents={totalCents}
        donorCount={donorCount}
      />
      <Donors transactions={donors} />
      <DonateBanner />
    </div>
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
}> = ({ donorCount, goalName: _goalName, ...goalValues }) => {
  const { goalCents, totalCents } = useAnimatedGoal(goalValues);
  return (
    <div className={styles.goal}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={Embellishment.src}
        alt=""
        className={styles.embellishment}
        style={{
          position: "absolute",
          left: Embellishment.width * 0,
          bottom: Embellishment.width * -0.15,
          width: Embellishment.width * 0.6,
          height: Embellishment.height * 0.6,
        }}
      />
      <Logo className={styles.logo} />
      <div className={styles.progressContainer}>
        <p className={styles.progressText}>
          <strong className={styles.progressTotal}>
            {dollars(totalCents)}
          </strong>
          <span className={styles.progressOf}>of</span>
          <span className={styles.progressGoal}>{dollars(goalCents)}</span>
        </p>
      </div>
      <div className={styles.progressBar}>
        <div
          className={styles.progress}
          style={{
            width: `${Math.min(100, 100 * (totalCents / goalCents))}%`,
          }}
        />
      </div>
      <div className={styles.donorContainer}>
        <p className={styles.donorCount}>
          {donorCount} {donorCount === 1 ? "Donor" : "Donors"}
        </p>
      </div>
    </div>
  );
};

interface TransitionAppearProps {
  appear: boolean;
  enter: string;
  enterFrom: string;
  enterTo: string;
}
function TransitionAppear({
  appear,
  enter,
  enterFrom,
  enterTo,
  children,
}: React.PropsWithChildren<TransitionAppearProps>) {
  const [mounted, setMounted] = useState(!appear);
  useEffect(() => {
    if (!mounted) {
      const handle = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(handle);
    }
  }, [mounted]);
  return (
    <div className={clsx(enter, mounted ? enterTo : enterFrom)}>{children}</div>
  );
}

const Donors: React.FC<{
  readonly transactions: readonly CommonTransaction[];
}> = ({ transactions }) => {
  const [appear, setAppear] = useState(false);
  useEffect(() => {
    setAppear(true);
  }, []);
  return (
    <div className={styles.donors}>
      {transactions.slice(0, 15).map(({ name, amount, created }) => (
        <TransitionAppear
          key={`${name}-${amount}-${created}`}
          appear={appear}
          enter={styles.donorEnter}
          enterFrom={styles.donorEnterFrom}
          enterTo={styles.donorEnterTo}
        >
          <div style={{ overflow: "hidden" }}>
            <div className={styles.donorBubble}>
              <div className={styles.donorName}>{name}</div>
              <div className={styles.donorAmount}>{dollars(amount)}</div>
            </div>
          </div>
        </TransitionAppear>
      ))}
    </div>
  );
};

const DonateBanner: React.FC<{}> = () => {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a href="/donate" className={styles.donateBanner}>
      <div className={styles.donateBannerText}>donate.missionbit.org</div>
    </a>
  );
};

const Page: NextPage<PageProps> = ({ batch, modifications, ...props }) => {
  if (batch === undefined || modifications === undefined) {
    return <Error404 {...props} />;
  } else {
    return (
      <Layout
        {...props}
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
