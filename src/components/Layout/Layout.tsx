import Link from "next/link";
import Image from "next/image";
import { FunctionComponent, ReactNode } from "react";
import { useRouter } from "next/router";
import { useTheme } from "next-themes";
import { SeasonSelector } from "~/components/Elements/SeasonSelector";

const NAV = [
  { label: "Home", href: "/", exact: true },
  { label: "Matches", href: "/matches" },
  { label: "Teams", href: "/teams" },
  { label: "Players", href: "/players" },
  { label: "Leaderboards", href: "/leaderboards" },
];

const NavLink: FunctionComponent<{
  label: string;
  href: string;
  exact?: boolean;
}> = ({ label, href, exact }) => {
  const router = useRouter();
  const active = exact
    ? router.pathname === href
    : router.pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`px-2 py-2 font-semibold text-sm whitespace-nowrap transition-opacity hover:opacity-100 ${
        active ? "opacity-100" : "opacity-50"
      }`}
    >
      {label}
    </Link>
  );
};

export const Layout: FunctionComponent<{ children: ReactNode }> = ({
  children,
}) => {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="max-w-3xl mx-auto min-h-dvh flex flex-col px-3 sm:px-4 pt-2 sm:pt-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-wrap items-center justify-between gap-x-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="py-1 shrink-0"
            aria-label="biliarDino, home"
          >
            <Image
              src="/brand/logo-light.svg"
              alt=""
              width={146}
              height={36}
              priority
              unoptimized
              className="dark:hidden"
            />
            <Image
              src="/brand/logo-dark.svg"
              alt=""
              width={146}
              height={36}
              priority
              unoptimized
              className="hidden dark:block"
            />
          </Link>
          <SeasonSelector />
        </div>
        <nav className="-mx-2 flex overflow-x-auto" aria-label="Main">
          {NAV.map(n => (
            <NavLink key={n.href} {...n} />
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="text-gray-500 text-xs mt-8 flex justify-between border-t dark:border-gray-700 pt-3 items-center">
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="h-9 px-3 rounded-lg border dark:border-gray-700"
          aria-label="Toggle dark mode"
        >
          ◐ Theme
        </button>
        <div>
          <Link href="/admin" className="hover:underline mr-3">
            Admin
          </Link>
          <b>biliarDino v{process.env.NEXT_PUBLIC_APP_VERSION}</b> - based on{" "}
          <a
            href="https://github.com/nehalist/hilde"
            className="hover:underline"
          >
            Hilde
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
