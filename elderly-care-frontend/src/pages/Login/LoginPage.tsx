import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../services/firebase";
import toast from "react-hot-toast";
import { Mail, Lock, Heart, Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("เข้าสู่ระบบสำเร็จ!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-4 font-sans">
      <div className="w-full max-w-md overflow-hidden rounded-[40px] bg-white shadow-2xl shadow-cyan-900/5">
        
        {/* ส่วนหัว */}
        <div className="bg-gradient-to-r from-[#0095B6] to-cyan-500 p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md">
            <Heart size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Elderly Care</h1>
          <p className="mt-2 text-sm font-medium text-cyan-50 opacity-90">ระบบดูแลผู้สูงอายุอัจฉริยะ</p>
        </div>

        {/* ฟอร์มเข้าสู่ระบบ */}
        <div className="p-8 sm:p-10">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-800">ยินดีต้อนรับ</h2>
            <p className="mt-1 text-sm text-slate-500">กรุณาเข้าสู่ระบบ</p>
          </div>

          {/* ใส่ autoComplete="off" ที่ฟอร์ม เพื่อปิดการจำค่ามั่วๆ ของบราว์เซอร์ */}
          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">อีเมล</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off" 
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-slate-800 outline-none transition-all focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">รหัสผ่าน</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  // ใช้ "new-password" เพื่อบังคับบราว์เซอร์ไม่ให้ยัดรหัสผ่านเก่าลงมา
                  autoComplete="new-password" 
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-slate-800 outline-none transition-all focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-lg disabled:bg-slate-400"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
              {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-medium text-slate-500">
            ยังไม่มีบัญชีใช่หรือไม่?{" "}
            <Link to="/register" className="text-cyan-600 transition-colors hover:text-cyan-700 hover:underline">
              สมัครสมาชิกเลย
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}