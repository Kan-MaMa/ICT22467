//src/components/layout/AppLayout.tsx
import type { ReactNode } from "react"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"

type AppLayoutProps = {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-h-screen flex-1 flex-col">
          {/* 🚨 ส่งค่า isOpen เป็น false และ onClose เป็นฟังก์ชันว่างๆ ไปให้ Topbar เพื่อแก้ Error TS2739 */}
          <Topbar isOpen={false} onClose={() => {}} />
          
          <main className="flex-1 p-6 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  )
}