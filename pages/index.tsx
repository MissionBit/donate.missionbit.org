import { NextPage } from "next";
import * as React from "react";
import { Layout } from "components/Layout";
import { PageProps, getServerSideProps } from "./live";
import Donate from "components/donate";
import { NewLogoContext } from "components/NewLogoContext";

const Page: NextPage<PageProps> = ({
  batch,
  modifications,
  prefill,
  newLogo,
  ...props
}) => (
  <Layout
    {...props}
    canonicalPath="/donate"
    title="Donate Today - Mission Bit"
    description="Donate and support San Francisco area 501c3 Mission Bit today with a tax-deductible donation."
  >
    <NewLogoContext.Provider value={newLogo ?? false}>
      <Donate
        campaign={batch && modifications ? { batch, modifications } : undefined}
        prefill={prefill}
      />
    </NewLogoContext.Provider>
  </Layout>
);

export { getServerSideProps };
export default Page;
