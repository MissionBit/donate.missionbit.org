import * as React from "react";
import { Layout, getStaticProps, LayoutStaticProps } from "components/Layout";
import { NextPage } from "next";
import styles from "./404.module.scss";
import clsx from "clsx";

const Page: NextPage<LayoutStaticProps> = (props) => (
  <Layout {...props} title="Mission Bit – 404 Not Found">
    <main className={clsx("px-container", styles.root)}>
      <h1>HTTP 404 Not Found</h1>
      <p>
        Oh no! The link you were looking for doesn't appear to be here anymore.
      </p>
      <h3>
        <a href="https://missionbit.org/">Check out our homepage</a>
      </h3>
    </main>
  </Layout>
);

export { getStaticProps };
export default Page;
