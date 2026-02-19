import Link from "next/link"
import { PublicShell } from "@/components/layout/public-shell"

const menuItems = [
  { label: "Admin Dashboard", href: "/admin", description: "System administration and platform control", icon: "⚙️" },
  { label: "Teacher Dashboard", href: "/teacher", description: "Create courses and manage classes", icon: "👨‍🏫" },
  { label: "Student Dashboard", href: "/student", description: "Access classes, progress, and messages", icon: "👨‍🎓" },
  { label: "Sign In", href: "/login", description: "Use your Neptino account credentials", icon: "🔐" },
]

export default function Home() {
  return (
    <PublicShell
      title="Welcome to Neptino"
      subtitle="A powerful platform for collaborative learning and course management."
    >
      <div className="space-y-8">
        {/* Feature Intro */}
        <div className="max-w-3xl">
          <p className="text-slate-700 text-base leading-relaxed mb-4">
            Neptino connects educators and learners in an interactive environment. Whether you&apos;re teaching a class, building curriculum, or advancing your knowledge, our platform provides the tools you need.
          </p>
        </div>

        {/* Menu Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative p-6 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:from-blue-50 hover:to-blue-50 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{item.icon}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition">{item.label}</h3>
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                </div>
                <span className="text-slate-400 group-hover:text-blue-600 transition">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Features Section */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Platform Capabilities</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-semibold text-slate-900 mb-2">Course Building</h4>
              <p className="text-sm text-slate-600">Create rich, interactive courses with multimedia content and assessments.</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <h4 className="font-semibold text-slate-900 mb-2">Live Learning</h4>
              <p className="text-sm text-slate-600">Real-time collaboration with integrated messaging and canvas tools.</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <h4 className="font-semibold text-slate-900 mb-2">Progress Tracking</h4>
              <p className="text-sm text-slate-600">Monitor learner engagement and achievement with detailed analytics.</p>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  )
}
