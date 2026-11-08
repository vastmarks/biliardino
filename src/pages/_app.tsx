import type { AppProps } from "next/app";
import "../styles/globals.css";
import { trpc } from "~/utils/trpc";
import { Layout } from "~/components/Layout";
import { Toaster } from "~/components/Elements/Toaster";
import { ThemeProvider } from "next-themes";
import localFont from "next/font/local";

/**
 * Geist, the typeface for all text (SIL Open Font Licence, see src/fonts/OFL.txt). Latin
 * characters only (28 kB), bundled with the app: no request to Google, same look on every device.
 */
const geist = localFont({
  src: "../fonts/Geist-Variable-latin.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className={`${geist.variable} font-sans`}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default trpc.withTRPC(App);
