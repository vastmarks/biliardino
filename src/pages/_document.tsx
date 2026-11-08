import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta
          name="theme-color"
          content="#F0F5F9"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#0A1621"
          media="(prefers-color-scheme: dark)"
        />
        <meta name="application-name" content="biliardino" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="biliardino" />
        {/* ?v= changes whenever the icons change: browsers keep favicons for a long time */}
        <link rel="icon" href="/favicon.ico?v=3" sizes="32x32" />
        <link rel="icon" href="/icon.svg?v=3" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
