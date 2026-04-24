import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
// 🚨 1. เพิ่ม getDocs และ collection เพื่อใช้ดึงรันรหัส A001 อัตโนมัติ
import { doc, setDoc, serverTimestamp, collection, getDocs } from "firebase/firestore"; 
import { auth, db } from "../../services/firebase"; 
import toast from "react-hot-toast";
import { Mail, Lock, Heart, User, Loader2, ShieldCheck, Check, X, Phone } from "lucide-react"; 

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); 
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [pwdStrength, setPwdStrength] = useState(0);
  const [pwdChecks, setPwdChecks] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

  useEffect(() => {
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
  }, []);

  useEffect(() => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[^A-Za-z0-9]/.test(password),
    };
    
    if (checks.length) score++;
    if (checks.uppercase) score++;
    if (checks.number) score++;
    if (checks.specialChar) score++;

    setPwdChecks(checks);
    setPwdStrength(score);
  }, [password]);

  // ฟังก์ชันรันรหัสแอดมิน 
  const findNextAvailableAdminId = async () => {
    const adminRef = collection(db, "admins");
    const snap = await getDocs(adminRef);
    
    // ดึง admin_id ทั้งหมดออกมาเช็ค
    const ids = snap.docs
      .map(d => d.data().admin_id)
      .filter(id => id && id.startsWith("A"))
      .map(id => parseInt(id.replace("A", ""), 10));
      
    ids.sort((a, b) => a - b);
    let next = 1;
    for (let i of ids) { 
      if (i === next) next++; 
      else if (i > next) break; 
    }
    return `A${String(next).padStart(3, '0')}`;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("รหัสผ่านไม่ตรงกัน!");
      return;
    }
    if (pwdStrength < 3) {
      toast.error("กรุณาตั้งรหัสผ่านให้ปลอดภัยกว่านี้");
      return;
    }

    setIsLoading(true);
    try {
      // สร้าง User ใน Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      // สร้างรหัส Admin อัตโนมัติ
      const nextAdminId = await findNextAvailableAdminId();

      // บันทึกลงคอลเลกชัน "admins" (อิงตามฐานข้อมูลของคุณ)
      await setDoc(doc(db, "admins", user.uid), {
        admin_id: nextAdminId, // รหัส A001, A002...
        admin_name: name,
        admin_phone: phone, 
        email: email,
        role: "admin", 
        createdAt: serverTimestamp(),
      });
      
      toast.success("สมัครสมาชิกสำเร็จ!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Register error:", error);
      toast.error(error.message === "Firebase: Error (auth/email-already-in-use)." 
        ? "อีเมลนี้มีผู้ใช้งานแล้ว" 
        : "เกิดข้อผิดพลาดในการสมัครสมาชิก");
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (pwdStrength === 0) return "bg-slate-200";
    if (pwdStrength <= 2) return "bg-rose-500 w-1/3";
    if (pwdStrength === 3) return "bg-amber-400 w-2/3";
    return "bg-emerald-500 w-full";
  };
  const getStrengthText = () => {
    if (pwdStrength === 0) return "ความปลอดภัย";
    if (pwdStrength <= 2) return "อ่อนแอ (ไม่แนะนำ)";
    if (pwdStrength === 3) return "ปานกลาง (ใช้งานได้)";
    return "แข็งแกร่งมาก! 🛡️";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-4 font-sans pb-10">
      <div className="w-full max-w-md overflow-hidden rounded-[40px] bg-white shadow-2xl shadow-cyan-900/5 mt-8">
        
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 text-center text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-white/5"><Heart size={120} /></div>
          <div className="relative z-10">
            <h1 className="text-2xl font-black tracking-tight">สร้างบัญชีผู้ดูแล</h1>
            <p className="mt-1 text-sm font-medium text-slate-300">เข้าร่วมระบบ Elderly Care วันนี้</p>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <form onSubmit={handleRegister} className="space-y-4" autoComplete="off">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">ชื่อ-นามสกุล</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"><User size={18} /></div>
                <input type="text" required autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition-all focus:border-cyan-500 focus:bg-white" placeholder="สมชาย ใจดี" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">อีเมล</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"><Mail size={18} /></div>
                <input type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition-all focus:border-cyan-500 focus:bg-white" placeholder="name@example.com" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">เบอร์โทรศัพท์</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"><Phone size={18} /></div>
                <input type="tel" required autoComplete="nope" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition-all focus:border-cyan-500 focus:bg-white" placeholder="เช่น 0812345678" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">รหัสผ่าน</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"><Lock size={18} /></div>
                <input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition-all focus:border-cyan-500 focus:bg-white" placeholder="สร้างรหัสผ่านของคุณ" />
              </div>

              {password.length > 0 && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-slate-600">ระดับความปลอดภัย:</span>
                    <span className={`text-[10px] font-bold ${pwdStrength <= 2 ? 'text-rose-500' : pwdStrength === 3 ? 'text-amber-500' : 'text-emerald-500'}`}>{getStrengthText()}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden mb-3">
                    <div className={`h-full rounded-full transition-all duration-300 ${getStrengthColor()}`}></div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-[10px] font-medium">
                    <span className={`flex items-center gap-1 ${pwdChecks.length ? 'text-emerald-600' : 'text-slate-400'}`}>{pwdChecks.length ? <Check size={12}/> : <X size={12}/>} 8 ตัวอักษรขึ้นไป</span>
                    <span className={`flex items-center gap-1 ${pwdChecks.uppercase ? 'text-emerald-600' : 'text-slate-400'}`}>{pwdChecks.uppercase ? <Check size={12}/> : <X size={12}/>} พิมพ์ใหญ่ (A-Z)</span>
                    <span className={`flex items-center gap-1 ${pwdChecks.number ? 'text-emerald-600' : 'text-slate-400'}`}>{pwdChecks.number ? <Check size={12}/> : <X size={12}/>} ตัวเลข (0-9)</span>
                    <span className={`flex items-center gap-1 ${pwdChecks.specialChar ? 'text-emerald-600' : 'text-slate-400'}`}>{pwdChecks.specialChar ? <Check size={12}/> : <X size={12}/>} อักขระพิเศษ (@,#)</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">ยืนยันรหัสผ่าน</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"><ShieldCheck size={18} /></div>
                <input type="password" required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition-all focus:border-cyan-500 focus:bg-white" placeholder="กรอกรหัสผ่านอีกครั้ง" />
              </div>
            </div>

            <button type="submit" disabled={isLoading || pwdStrength < 3 || password !== confirmPassword} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0095B6] py-4 text-sm font-bold text-white transition-all hover:bg-cyan-700 hover:shadow-lg disabled:bg-slate-300 disabled:shadow-none">
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <User size={20} />}
              {isLoading ? "กำลังลงทะเบียน..." : "สมัครสมาชิก"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-medium text-slate-500">
            มีบัญชีอยู่แล้วใช่หรือไม่?{" "}
            <Link to="/login" className="text-slate-800 font-bold transition-colors hover:text-cyan-600 hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}