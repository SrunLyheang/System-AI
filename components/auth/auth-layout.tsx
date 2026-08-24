interface AuthLayoutProps {
  children: React.ReactNode
}

const FEATURES = [
  "Design canvases with real-time collaboration",
  "AI-generated specs from your project graph",
  "Version-controlled design history",
]

function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-base">
      <div className="hidden w-1/2 flex-col justify-center gap-6 border-r border-surface-border px-16 lg:flex">
        <span className="text-sm font-semibold tracking-wide text-brand">
          System AI
        </span>
        <p className="max-w-sm text-2xl font-medium text-copy-primary">
          Design, collaborate, and ship specs faster.
        </p>
        <ul className="flex flex-col gap-2 text-sm text-copy-muted">
          {FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        {children}
      </div>
    </div>
  )
}

export { AuthLayout }
