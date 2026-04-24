// src/components/layout/Sidebar.tsx
import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { auth } from "../../services/firebase";  
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Activity,
  LogOut, 
} from "lucide-react";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: <LayoutDashboard size={20} /> },
  { label: "ผู้สูงอายุ", to: "/elderly", icon: <Users size={20} /> },
  { label: "สถานที่ / แผนที่", to: "/emergency", icon: <MapPin size={20} /> },
  { label: "สัญญาณชีพ", to: "/vitals", icon: <Activity size={20} /> },
];

export default function Sidebar() {
  const navigate = useNavigate();

  // 🚨ฟังก์ชันสำหรับออกจากระบบ
  const handleLogout = async () => {
    // ถามเพื่อความแน่ใจก่อนออกจากระบบ
    if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      try {
        await signOut(auth);
        toast.success("ออกจากระบบเรียบร้อยแล้ว");
        navigate("/login"); // เตะกลับไปหน้า Login
      } catch (error) {
        console.error("Logout Error:", error);
        toast.error("เกิดข้อผิดพลาดในการออกจากระบบ");
      }
    }
  };

  return (
    // เพิ่ม relative เพื่อให้จัดตำแหน่งปุ่ม Logout ไว้ด้านล่างสุดได้
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white xl:flex xl:flex-col relative">
      <div 
        onClick={() => navigate("/")} 
        className="cursor-pointer hover:opacity-80 transition-opacity mb-8 border-slate-200 px-8 py-4 mt-4"
      >
        <h1 className="text-xl font-semibold uppercase tracking-[0.2em] text-cyan-600">Health Care</h1>
        <h2 className="text-2xl font-bold text-slate-900">Elderly Care</h2>
        <p className="text-sm text-slate-500">ระบบดูแลผู้สูงอายุอัจฉริยะ</p>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-cyan-50 text-cyan-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? "text-cyan-600" : "text-slate-400"}>
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/*  ปุ่ม Logout ด้านล่างสุด */}
      <div className="absolute bottom-0 w-full p-4 border-t border-slate-100 bg-white">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-colors"
        >
          <LogOut size={20} />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}