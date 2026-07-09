import React, { useState } from 'react';
import { LogIn, User, Shield, Key, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';

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
      ? { id: studentId, name, department, password, role }
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

  return (
    <div id="login-container" className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transition-all duration-300 transform hover:scale-[1.01]">
        {/* Header decoration */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 px-6 py-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
          
          <div className="inline-flex p-3.5 bg-white/15 backdrop-blur-md rounded-2xl mb-3 shadow-inner">
            <BookOpen className="w-8 h-8 text-emerald-100 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-wide font-sans">ระบบจัดการและยืมหนังสือ</h1>
          <p className="text-emerald-50/85 text-xs mt-1.5 font-medium tracking-wider">เช็คจำนวนหนังสือเข้า - จ่ายออก และขอยืมคืนแบบอัจฉริยะ</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-2 gap-1">
          <button
            id="tab-student"
            type="button"
            onClick={() => handleRoleChange('student')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              role === 'student'
                ? 'bg-white text-emerald-700 shadow-md border border-slate-100/50'
                : 'text-slate-600 hover:bg-white/40 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            นักเรียน / ผู้ยืม
          </button>
          <button
            id="tab-teacher"
            type="button"
            onClick={() => handleRoleChange('teacher')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              role === 'teacher'
                ? 'bg-white text-teal-700 shadow-md border border-slate-100/50'
                : 'text-slate-600 hover:bg-white/40 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            คุณครู / เจ้าหน้าที่
          </button>
          <button
            id="tab-admin"
            type="button"
            onClick={() => handleRoleChange('admin')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              role === 'admin'
                ? 'bg-white text-indigo-700 shadow-md border border-slate-100/50'
                : 'text-slate-600 hover:bg-white/40 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            แอดมิน
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8">
          {/* Notifications */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border-l-4 border-rose-500 rounded-xl text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-5 p-3.5 bg-emerald-50 border-l-4 border-emerald-500 rounded-xl text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
              <p>{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            {isRegistering ? (
              /* --- REGISTRATION FORM --- */
              <>
                {role === 'student' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">รหัสนักเรียน / รหัสผ่านดั้งเดิม *</label>
                      <input
                        id="reg-student-id"
                        type="text"
                        required
                        placeholder="เช่น 65010111"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">ชื่อ - นามสกุล *</label>
                      <input
                        id="reg-student-name"
                        type="text"
                        required
                        placeholder="เด็กชายวิทยา เรียนดี"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">ห้องเรียน / ระดับชั้น / ฝ่าย *</label>
                      <input
                        id="reg-student-dept"
                        type="text"
                        required
                        placeholder="เช่น ม.3/1 หรือ เทคโนโลยีสารสนเทศ (IT-3A)"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">ชื่อบัญชีผู้ใช้งาน (Username) คุณครู *</label>
                      <input
                        id="reg-teacher-username"
                        type="text"
                        required
                        placeholder="เช่น teacher_somchai"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">ชื่อ - นามสกุล คุณครู *</label>
                      <input
                        id="reg-teacher-name"
                        type="text"
                        required
                        placeholder="ครูสุรศักดิ์ ใจกว้าง"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">กำหนดรหัสผ่านใหม่ของคุณ *</label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="กำหนดรหัสผ่านเพื่อเข้าใช้งานภายหลัง"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-register-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  ลงทะเบียนผู้ใช้และตั้งรหัสผ่าน
                </button>

                <div className="text-center mt-3 text-sm">
                  <span className="text-slate-500">ลงทะเบียนสำเร็จแล้ว? </span>
                  <button
                    id="btn-switch-login"
                    type="button"
                    onClick={() => {
                      setIsRegistering(false);
                      setError('');
                    }}
                    className="text-emerald-600 hover:underline font-bold"
                  >
                    กลับไปเข้าสู่ระบบ
                  </button>
                </div>
              </>
            ) : (
              /* --- LOGIN FORM --- */
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    {role === 'student' ? 'รหัสนักเรียน (Student ID)' : 'ชื่อผู้ใช้งาน (Username)'} *
                  </label>
                  <input
                    id="login-username"
                    type="text"
                    required
                    placeholder={role === 'student' ? 'เช่น 65010111' : role === 'admin' ? 'admin' : 'เช่น teacher1'}
                    value={role === 'student' ? studentId : username}
                    onChange={(e) => role === 'student' ? setStudentId(e.target.value) : setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">รหัสผ่าน (Password) *</label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="รหัสผ่านของคุณ (ตัวอย่าง: 123 หรือ 44120)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  เข้าสู่ระบบ
                </button>

                {role !== 'admin' && (
                  <div className="text-center mt-4 text-xs sm:text-sm border-t border-slate-100 pt-3">
                    <span className="text-slate-500">ใช้งานครั้งแรกและยังไม่มีรหัสผ่าน? </span>
                    <button
                      id="btn-switch-register"
                      type="button"
                      onClick={() => {
                        setIsRegistering(true);
                        setError('');
                      }}
                      className="text-emerald-600 hover:underline font-bold"
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
  );
}
