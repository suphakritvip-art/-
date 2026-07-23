import React, { useState } from 'react';
import { 
  LogIn, User, Shield, Key, Eye, EyeOff, Loader2, CheckCircle2, 
  AlertCircle, BookOpen, Mail, Send, X, ArrowLeft, Activity, Sparkles, Database 
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: any, role: 'student' | 'teacher' | 'admin') => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  
  // Forgot Password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStudentId, setForgotStudentId] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [mockEmailMessage, setMockEmailMessage] = useState<{ studentId: string; currentPassword: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Status feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setStudentId('');
    setName('');
    setDepartment('');
    setEmail('');
    setError('');
    setSuccess('');
  };

  const handleRoleChange = (newRole: 'student' | 'teacher' | 'admin') => {
    setRole(newRole);
    setIsRegistering(false);
    resetForm();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const loginId = role === 'student' ? studentId : username;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginId, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsRegistration) {
          setError(data.message);
          setIsRegistering(true);
          setStudentId(data.student.id);
          setName(data.student.name);
          setDepartment(data.student.department);
        } else {
          setError(data.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
        }
        setLoading(false);
        return;
      }

      setSuccess('เข้าสู่ระบบสำเร็จ! กำลังเปลี่ยนหน้าไปยังหน้าหลักของคุณ...');
      setTimeout(() => {
        onLoginSuccess(data.user, data.role);
      }, 1000);
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const payload = role === 'student' 
      ? { id: studentId, name, department, password, role, email }
      : { username, name, password, role };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'การลงทะเบียนล้มเหลว');
        setLoading(false);
        return;
      }

      setSuccess('ลงทะเบียนสำเร็จ! คุณสามารถใช้ข้อมูลนี้เข้าสู่ระบบได้ทันที');
      setIsRegistering(false);
      setPassword(''); // keep inputs for faster login experience
      setLoading(false);
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์คลังหนังสือได้');
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      const res = await fetch('/api/auth/student-forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: forgotStudentId, email: forgotEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.message || 'ข้อมูลนักเรียนหรืออีเมลไม่ถูกต้อง');
        setForgotLoading(false);
        return;
      }

      setForgotSuccess(data.message || 'ระบบได้ส่งรหัสกู้คืนไปยังอีเมลของคุณเรียบร้อยแล้ว');
      setMockEmailMessage({
        studentId: forgotStudentId,
        currentPassword: data.currentPassword || ''
      });
      setResetStep(1);
      setForgotLoading(false);
    } catch (err) {
      setForgotError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    if (!newPassword || newPassword.length < 4) {
      setForgotError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      setForgotLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/student-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: forgotStudentId, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
        setForgotLoading(false);
        return;
      }

      setForgotSuccess('เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว! ระบบกำลังป้อนข้อมูลเพื่อเข้าสู่ระบบ...');
      setForgotLoading(false);

      setTimeout(() => {
        setShowForgotModal(false);
        setStudentId(forgotStudentId);
        setPassword(newPassword);
        setMockEmailMessage(null);
        setForgotSuccess('');
      }, 2000);
    } catch (err) {
      setForgotError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      setForgotLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen w-full flex flex-col md:flex-row bg-slate-950 text-slate-100 overflow-hidden relative">
      
      {/* LEFT COLUMN: BRANDING & MOTIVATIONAL HIGHLIGHTS */}
      <div className="hidden md:flex md:w-[45%] bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-12 flex-col justify-between relative overflow-hidden border-r border-slate-900">
        {/* Abstract cyber decoration */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>
        
        {/* Soft colorful backdrop orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[80px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[100px]"></div>

        {/* Logo block */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-md mb-8">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span className="text-[11px] font-black tracking-wider text-emerald-300 uppercase">Smart Library</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-emerald-200 via-teal-200 to-indigo-200 bg-clip-text text-transparent">
            ระบบจัดการ<br />เเละยืมหนังสือเรียน
          </h1>
          <p className="text-slate-400 text-sm mt-4 max-w-sm leading-relaxed">
            นวัตกรรมจัดการคลังหนังสือเรียนอย่างอัจฉริยะ ตรวจสอบยอดสต็อก แจกจ่ายหนังสือสะสม และดำเนินการทำเรื่องขอยืม-คืนแบบเต็มรูปแบบด้วยระบบเรียลไทม์
          </p>
        </div>

        {/* Bento features */}
        <div className="space-y-4 relative z-10 max-w-sm">
          <div className="p-4.5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] rounded-2xl transition-all duration-300 flex gap-4 group">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">ตรวจสอบเรียลไทม์ (Real-time updates)</h4>
              <p className="text-[11px] text-slate-400 mt-1">อัปเดตสถิตินำเข้าคลังเเละเเจกจ่ายสะสมในชั้นเรียนได้วินาทีต่อวินาที</p>
            </div>
          </div>

          <div className="p-4.5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] rounded-2xl transition-all duration-300 flex gap-4 group">
            <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">ยืมคลังและจัดการแบบไร้รอยต่อ</h4>
              <p className="text-[11px] text-slate-400 mt-1">นักเรียนขอยืมสะดวก รหัสผ่านปลอดภัย คุณครูอนุมัติรวดเร็วในหน้าเดียว</p>
            </div>
          </div>

          <div className="p-4.5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] rounded-2xl transition-all duration-300 flex gap-4 group">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">นำเข้าสมาชิกอิง Google Sheets</h4>
              <p className="text-[11px] text-slate-400 mt-1">ประหยัดเวลากรอกด้วยระบบซิงก์ดึงรายชื่อห้องเรียนจากภายนอกเข้าสู่ระบบทันที</p>
            </div>
          </div>
        </div>

        {/* Left Footer */}
        <div className="text-[10px] text-slate-500 tracking-wider relative z-10 font-mono">
          © 2026 Smart Library Platform. Designed for Excellence.
        </div>
      </div>

      {/* RIGHT COLUMN: LOGIN / REGISTER PANE */}
      <div className="flex-1 min-h-screen flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto bg-slate-950">
        {/* Subtle glowing spheres */}
        <div className="absolute top-[20%] right-[10%] w-[250px] h-[250px] rounded-full bg-emerald-500/10 blur-[60px] md:hidden"></div>
        <div className="absolute bottom-[20%] left-[10%] w-[250px] h-[250px] rounded-full bg-indigo-500/10 blur-[60px] md:hidden"></div>

        <div className="w-full max-w-md z-10 space-y-6">
          
          {/* Logo / Title for mobile device */}
          <div className="md:hidden text-center space-y-2">
            <div className="inline-flex p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-inner mb-2">
              <BookOpen className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-wide">ระบบจัดการและยืมหนังสือ</h2>
            <p className="text-slate-400 text-xs font-medium">เช็คจำนวนหนังสือเข้า - จ่ายออก และขอยืมคืนอัจฉริยะ</p>
          </div>

          {/* Glowing central glass-card */}
          <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/80 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300">
            
            {/* Role Selectors styled as premium buttons */}
            <div className="p-3 bg-slate-950/60 border-b border-slate-900/80 flex gap-1.5">
              <button
                id="tab-student"
                type="button"
                onClick={() => handleRoleChange('student')}
                className={`flex-1 py-3 px-2 rounded-xl text-xs font-extrabold tracking-wide transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'student'
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/25 border border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>นักเรียน / ผู้ยืม</span>
              </button>
              <button
                id="tab-teacher"
                type="button"
                onClick={() => handleRoleChange('teacher')}
                className={`flex-1 py-3 px-2 rounded-xl text-xs font-extrabold tracking-wide transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'teacher'
                    ? 'bg-gradient-to-r from-teal-500/20 to-indigo-500/25 border border-teal-500/30 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.1)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>ครู / เจ้าหน้าที่</span>
              </button>
              <button
                id="tab-admin"
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`flex-1 py-3 px-2 rounded-xl text-xs font-extrabold tracking-wide transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'admin'
                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/25 border border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>แอดมิน</span>
              </button>
            </div>

            {/* Login / Register Card Body */}
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Feedback Alerts */}
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-xs sm:text-sm flex items-start gap-3 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-300 text-xs sm:text-sm flex items-start gap-3 animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              {/* Form elements */}
              <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
                {isRegistering ? (
                  /* --- REGISTRATION FORM --- */
                  <>
                    {role === 'student' ? (
                      <>
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-4 rounded-2xl text-xs font-medium leading-relaxed mb-4">
                          ⚠️ <strong>คำแนะนำในการลงทะเบียน:</strong> โปรดใช้รหัสประจำตัวนักเรียน/นักศึกษาของตัวเองเท่านั้นในการลงทะเบียนและกำหนดรหัสผ่านเพื่อความปลอดภัยและถูกต้องของข้อมูลการยืมหนังสือ
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">รหัสประจำตัวนักเรียน/นักศึกษา *</label>
                          <input
                            id="reg-student-id"
                            type="text"
                            required
                            placeholder="เช่น 65010111"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            className="w-full px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-slate-800 focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none transition-all text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">ชื่อ - นามสกุล *</label>
                          <input
                            id="reg-student-name"
                            type="text"
                            required
                            placeholder="เด็กชายวิทยา เรียนดี"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-slate-800 focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none transition-all text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">ห้องเรียน / ระดับชั้น / ฝ่าย *</label>
                          <input
                            id="reg-student-dept"
                            type="text"
                            required
                            placeholder="เช่น ม.3/1 หรือ เทคโนโลยีสารสนเทศ (IT-3A)"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-slate-800 focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none transition-all text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">อีเมลสำหรับการกู้คืนรหัสผ่าน *</label>
                          <input
                            id="reg-student-email"
                            type="email"
                            required
                            placeholder="เช่น student@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-slate-800 focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none transition-all text-sm"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">ชื่อบัญชีผู้ใช้งาน (Username) คุณครู *</label>
                          <input
                            id="reg-teacher-username"
                            type="text"
                            required
                            placeholder="เช่น teacher_somchai"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-slate-800 focus:border-teal-500/80 focus:ring-4 focus:ring-teal-500/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none transition-all text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">ชื่อ - นามสกุล คุณครู *</label>
                          <input
                            id="reg-teacher-name"
                            type="text"
                            required
                            placeholder="ครูสุรศักดิ์ ใจกว้าง"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-slate-800 focus:border-teal-500/80 focus:ring-4 focus:ring-teal-500/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none transition-all text-sm"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">กำหนดรหัสผ่านใหม่ของคุณ *</label>
                      <div className="relative">
                        <input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="กำหนดรหัสผ่านเพื่อเข้าใช้งานภายหลัง"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-4 pr-11 py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-slate-800 focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none transition-all text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      id="btn-register-submit"
                      type="submit"
                      disabled={loading}
                      className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                      ลงทะเบียนผู้ใช้และตั้งรหัสผ่าน
                    </button>

                    <div className="text-center mt-4 text-xs">
                      <span className="text-slate-400">ลงทะเบียนสำเร็จแล้ว? </span>
                      <button
                        id="btn-switch-login"
                        type="button"
                        onClick={() => {
                          setIsRegistering(false);
                          setError('');
                        }}
                        className="text-emerald-400 hover:text-emerald-300 hover:underline font-bold"
                      >
                        กลับไปเข้าสู่ระบบ
                      </button>
                    </div>
                  </>
                ) : (
                  /* --- LOGIN FORM --- */
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {role === 'student' ? 'รหัสประจำตัวนักเรียน/นักศึกษา (Student ID) *' : 'ชื่อผู้ใช้งาน (Username ภาษาอังกฤษ) *'}
                      </label>
                      <input
                        id="login-username"
                        type="text"
                        required
                        placeholder={role === 'student' ? 'เช่น 65010111' : role === 'admin' ? 'ชื่อผู้ใช้งาน' : 'ชื่อภาษาอังกฤษของคุณครู (เช่น somsaki)'}
                        value={role === 'student' ? studentId : username}
                        onChange={(e) => role === 'student' ? setStudentId(e.target.value) : setUsername(e.target.value)}
                        className="w-full px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-slate-800 focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none transition-all text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">รหัสผ่าน (Password) *</label>
                      <div className="relative">
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder={role === 'student' ? 'รหัสผ่านของคุณ' : role === 'admin' ? 'รหัสผ่าน' : 'วันเดือนปีเกิดของคุณครู (เช่น 20/10/2540)'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-4 pr-11 py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-slate-800 focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none transition-all text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {role === 'student' && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowForgotModal(true);
                              setForgotStudentId(studentId);
                              setForgotEmail('');
                              setForgotError('');
                              setForgotSuccess('');
                              setResetStep(1);
                              setMockEmailMessage(null);
                            }}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline font-bold"
                          >
                            ลืมรหัสผ่าน? (Forgot Password)
                          </button>
                        </div>
                      )}
                      {role === 'teacher' && (
                        <div className="text-[11px] text-slate-400 mt-2 leading-relaxed bg-white/[0.01] border border-slate-900 p-3 rounded-xl">
                          💡 <strong>คำแนะนำสำหรับคุณครู:</strong> กรอกชื่อผู้ใช้ด้วย <strong>Username ภาษาอังกฤษ</strong> และใช้ <strong>วันเดือนปีเกิด</strong> (รูปแบบ เช่น <code>20/10/2540</code>) เป็นรหัสผ่านเพื่อเข้าใช้งาน
                        </div>
                      )}
                    </div>

                    <button
                      id="btn-login-submit"
                      type="submit"
                      disabled={loading}
                      className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                      เข้าสู่ระบบ
                    </button>

                    {role === 'student' && (
                      <div className="text-center mt-6 text-xs border-t border-slate-900 pt-4">
                        <span className="text-slate-400">ใช้งานครั้งแรกและยังไม่มีรหัสผ่าน? </span>
                        <button
                          id="btn-switch-register"
                          type="button"
                          onClick={() => {
                            setIsRegistering(true);
                            setError('');
                          }}
                          className="text-emerald-400 hover:text-emerald-300 hover:underline font-bold"
                        >
                          คลิกลงทะเบียนบัญชีที่นี่
                        </button>
                      </div>
                    )}
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal Overlay */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col text-slate-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-850 flex items-center justify-between bg-slate-950/50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">กู้คืนรหัสผ่านนักเรียน (Recovery)</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">ระบบกู้คืนรหัสผ่านจำลองด้วยกล่องจดหมาย</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4 flex-1">
              {forgotError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{forgotError}</span>
                </div>
              )}
              {forgotSuccess && !mockEmailMessage && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-emerald-300 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              {!mockEmailMessage ? (
                /* STEP 1: ENTER STUDENT ID & REGISTERED EMAIL */
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl text-xs text-slate-400 leading-relaxed">
                    💡 <strong>ขั้นตอนกู้คืน:</strong> ป้อนรหัสประจำตัวนักเรียนของคุณและ <strong>อีเมลที่ใช้ลงทะเบียน</strong> ระบบจะเปิดหน้าต่างกล่องจดหมายจำลองเพื่อให้เลือกปรับแต่งรหัสผ่านใหม่หรือเข้าใช้งานต่อได้ทันที
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">รหัสประจำตัวนักเรียน/นักศึกษา *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น 65010111"
                      value={forgotStudentId}
                      onChange={(e) => setForgotStudentId(e.target.value)}
                      className="w-full px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-slate-800 focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">อีเมลที่ใช้ลงทะเบียน *</label>
                    <input
                      type="email"
                      required
                      placeholder="เช่น student@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-slate-800 focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                    ตรวจสอบข้อมูลกู้คืนรหัสผ่าน
                  </button>
                </form>
              ) : (
                /* MOCK EMAIL RECEIVED INTERACTIVE VIEW */
                <div className="space-y-4">
                  {resetStep === 1 ? (
                    <div className="space-y-4 animate-fadeIn">
                      {/* Simulation Notice */}
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-4 rounded-2xl text-xs font-medium leading-relaxed">
                        📨 <strong>ระบบจำลองกล่องจดหมาย (Simulated Email):</strong> เนื่องจากทำงานบนระบบ Sandbox จึงมีจดหมายจำลองส่งมาหาคุณโดยตรงที่กล่องข้อความด้านล่าง เพื่อตั้งค่ารหัสผ่านใหม่หรือยืนยันใช้งานรหัสผ่านเดิมได้ทันที
                      </div>

                      {/* Simulated Mailbox */}
                      <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-slate-950">
                        {/* Mail Header */}
                        <div className="bg-slate-900 text-slate-300 px-4 py-3.5 text-xs flex justify-between items-center border-b border-slate-850 font-mono">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block animate-ping"></span>
                            <span>To: {forgotEmail}</span>
                          </span>
                          <span className="text-slate-500 text-[10px]">จาก: noreply@library.ac.th</span>
                        </div>
                        
                        {/* Mail Body */}
                        <div className="p-5 space-y-4 text-slate-300 text-xs sm:text-sm">
                          <div className="font-extrabold text-white text-sm sm:text-base">หัวข้อ: คำขอกู้คืนรหัสผ่านระบบจัดการหนังสือ ({forgotStudentId})</div>
                          <p className="text-slate-400">เรียน นักศึกษารหัสประจำตัว <strong>{forgotStudentId}</strong></p>
                          <p className="text-slate-400 leading-relaxed text-xs">
                            ระบบได้รับคำขอกู้คืนรหัสผ่านของคุณตามที่ส่งคำขอเข้ามาเรียบร้อยแล้ว ท่านสามารถเลือกที่จะเปลี่ยนแก้ไขรหัสผ่านใหม่ หรือเลือกใช้รหัสผ่านดั้งเดิมเพื่อเข้าสู่ระบบต่อได้ทันทีด้านล่างนี้:
                          </p>

                          <div className="pt-2 flex flex-col sm:flex-row gap-3">
                            {/* Option A: Reset Password */}
                            <button
                              type="button"
                              onClick={() => {
                                setResetStep(2);
                                setNewPassword('');
                                setForgotSuccess('');
                                setForgotError('');
                              }}
                              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center transition-all shadow-md hover:shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              ✏️ แก้ไขและตั้งรหัสผ่านใหม่
                            </button>

                            {/* Option B: Use old password */}
                            <button
                              type="button"
                              onClick={() => {
                                setForgotSuccess('คุณเลือกใช้รหัสผ่านดั้งเดิม ระบบจะนำรหัสผ่านดั้งเดิมมากรอกให้และเข้าสู่ระบบทันที...');
                                setTimeout(() => {
                                  setShowForgotModal(false);
                                  setStudentId(forgotStudentId);
                                  setPassword(mockEmailMessage.currentPassword);
                                }, 1500);
                              }}
                              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-755 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              🔑 ใช้รหัสผ่านเดิม (รหัส: {mockEmailMessage.currentPassword})
                            </button>
                          </div>
                        </div>
                        <div className="bg-slate-900 px-4 py-2 text-[10px] text-slate-500 font-mono text-center border-t border-slate-850">
                          Securely encrypted simulation token: {forgotStudentId}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* STEP 2: SET NEW PASSWORD FORM */
                    <form onSubmit={handleResetPasswordSubmit} className="space-y-4 animate-fadeIn">
                      <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                        <button
                          type="button"
                          onClick={() => setResetStep(1)}
                          className="hover:text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <ArrowLeft className="w-3 h-3" /> ย้อนกลับไปกล่องจดหมายจำลอง
                        </button>
                      </div>
                      <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl text-xs text-slate-400 leading-relaxed">
                        📝 <strong>กำหนดรหัสผ่านใหม่:</strong> ระบุรหัสผ่านใหม่สำหรับรหัสประจำตัวนักเรียน <strong>{forgotStudentId}</strong> ของคุณ
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400">รหัสผ่านใหม่ของคุณ *</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            placeholder="กำหนดรหัสผ่านใหม่"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-4 pr-11 py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-slate-800 focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {forgotSuccess && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-emerald-300 text-xs flex items-start gap-2 animate-fadeIn">
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{forgotSuccess}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {forgotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-4 h-4" />}
                        ยืนยันการเปลี่ยนรหัสผ่านใหม่
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
