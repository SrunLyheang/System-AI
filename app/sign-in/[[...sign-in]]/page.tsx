import { SignIn } from "@clerk/nextjs"

import { AuthLayout } from "@/components/auth/auth-layout"

function SignInPage() {
  return (
    <AuthLayout>
      <SignIn />
    </AuthLayout>
  )
}

export default SignInPage
