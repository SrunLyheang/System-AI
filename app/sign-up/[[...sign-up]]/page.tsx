import { SignUp } from "@clerk/nextjs"

import { AuthLayout } from "@/components/auth/auth-layout"

function SignUpPage() {
  return (
    <AuthLayout>
      <SignUp />
    </AuthLayout>
  )
}

export default SignUpPage
