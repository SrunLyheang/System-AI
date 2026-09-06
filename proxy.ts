import { clerkMiddleware } from "@clerk/nextjs/server";

const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in";
const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up";

const isPublicRoute = (path: string) =>
  path.startsWith(signInUrl) || path.startsWith(signUpUrl);

// API route handlers enforce auth themselves and return a JSON 401, so they are
// excluded from proxy-level protection (which answers a bare 404 for non-page
// requests).
const isApiRoute = (path: string) => path.startsWith("/api/");

export default clerkMiddleware(async (auth, request) => {
  const path = request.nextUrl.pathname;
  if (isApiRoute(path)) {
    return;
  }
  if (!isPublicRoute(path)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
