import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher([
  `${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}(.*)`,
  `${process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}(.*)`,
])

// API route handlers enforce auth themselves and return a JSON 401, so they are
// excluded from proxy-level protection (which answers a bare 404 for non-page
// requests).
const isApiRoute = createRouteMatcher(["/api/(.*)"])

export default clerkMiddleware(async (auth, request) => {
  if (isApiRoute(request)) {
    return
  }
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
