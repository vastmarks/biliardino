// Next.js 16 calls this file "proxy" (it was "middleware"): it runs before matching requests.
// Here it sends anyone who isn't logged in as admin to the login page.
export { default as proxy } from "next-auth/middleware";

export const config = {
  matcher: ["/admin/:path*"],
};
