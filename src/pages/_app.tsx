import type { AppProps } from "next/app";
import "../styles/globals.css";
import { trpc } from "~/utils/trpc";
import { Layout } from "~/components/Layout";
import { Toaster } from "~/components/Elements/Toaster";
import { ThemeProvider } from "next-themes";
import localFont from "next/font/local";

/** Brand typeface for headings (Outfit, SIL Open Font Licence, see src/fonts/OFL.txt). Bundled, no Google request. */
const outfit = localFont({
  src: "../fonts/Outfit-Variable.woff2",
  variable: "--font-outfit",
  weight: "100 900",
  display: "swap",
});

function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className={outfit.variable}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default trpc.withTRPC(App);
