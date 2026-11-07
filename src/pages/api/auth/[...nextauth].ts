import { createHash, timingSafeEqual } from "crypto";
import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

/** Constant-time comparison, so response times don't leak how much of a guess was right. */
function passwordMatches(guess: string, password: string): boolean {
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(guess), hash(password));
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * One admin account, password from ADMIN_PASSWORD. Players don't log in: entering matches
 * and players is open to everyone who can reach the app (keep it on your LAN).
 */
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const password = process.env.ADMIN_PASSWORD;
        if (
          password &&
          credentials?.password &&
          passwordMatches(credentials.password, password)
        ) {
          return { id: "admin", name: "admin" };
        }
        await sleep(1000); // slows down password guessing
        return null;
      },
    }),
  ],
  session: { maxAge: 30 * 24 * 60 * 60 },
};

export default NextAuth(authOptions);
