import { Logo } from "@/components/ui/misc";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-5 py-12 overflow-hidden">
      <div className="hero-grid-bg absolute inset-0" />
      <div className="hero-blob w-[420px] h-[420px] -top-32 left-1/3" style={{ background: "#dc143c" }} />
      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        {children}
        <p className="text-center text-[11px] text-zinc-600 mt-8">
          © {new Date().getFullYear()} WebForge AI, Inc.
        </p>
      </div>
    </div>
  );
}
