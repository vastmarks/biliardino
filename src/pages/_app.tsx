import type { AppProps } from "next/app";
import "../styles/globals.css";
import { trpc } from "~/utils/trpc";
import { Layout } from "~/components/Layout";
import { Toaster } from "~/components/Elements/Toaster";
import { ThemeProvider } from "next-themes";

function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Layout>
        <Component {...pageProps} />
      </Layout>
      <Toaster />
    </ThemeProvider>
  );
}

export default trpc.withTRPC(App);
