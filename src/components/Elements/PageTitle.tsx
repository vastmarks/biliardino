import Head from "next/head";
import { FunctionComponent } from "react";

export const PageTitle: FunctionComponent<{ title?: string }> = ({ title }) => (
  <Head>
    <title>{title ? `${title} - Hilde` : "Hilde"}</title>
  </Head>
);
