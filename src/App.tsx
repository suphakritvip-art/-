import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import AdminPanel from './components/AdminPanel';
import { BookOpen, User, LogOut, ShieldAlert, Sparkles, Clock } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'student' | 'teacher' | 'admin' | null>(null);
  const [appTime, setAppTime] = useState<string>('');

  // Hydrate user session from localStorage if available (for better UX)
  useEffect(() => {
    const savedUser = localStorage.getItem('attendance_user');
    const savedRole = localStorage.getItem('attendance_role');
    if (savedUser && savedRole) {
      setUser(JSON.parse(savedUser));
      setRole(savedRole as any);
    }

    // Keep clock updated for realistic workspace design
    const updateTime = () => {
      const now = new Date();
      setAppTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' น.');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLoginSuccess = (loggedInUser: any, userRole: 'student' | 'teacher' | 'admin') => {
    setUser(loggedInUser);
    setRole(userRole);
    localStorage.setItem('attendance_user', JSON.stringify(loggedInUser));
    localStorage.setItem('attendance_role', userRole);
  };

  const handleLogout = () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('attendance_user');
    localStorage.removeItem('attendance_role');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans transition-all selection:bg-blue-600/10 selection:text-blue-700">
      {/* Top Main Navigation Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-sm shadow-emerald-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-800 text-base font-display tracking-tight flex items-center gap-1.5">
                ระบบคลังหนังสือและยืม-คืนอัจฉริยะ
                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-extrabold border border-emerald-100">V3.0</span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">ตรวจสอบสถานะแบบเรียลไทม์และซิงก์ดึงข้อมูลผ่าน Google Sheets</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Real-time Clock display */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 font-semibold">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>เวลาปัจจุบัน: <strong className="text-slate-800 font-mono">{appTime}</strong></span>
            </div>

            {user && role && (
              <div className="flex items-center gap-2 text-xs">
                <div className="bg-slate-50 border border-slate-150 rounded-xl py-1.5 px-3 flex items-center gap-2 font-semibold text-slate-700">
                  {role === 'admin' ? (
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                  ) : (
                    <User className="w-4 h-4 text-teal-600" />
                  )}
                  <span className="max-w-[120px] sm:max-w-xs truncate">
                    {role === 'admin' ? 'แอดมินระบบ' : role === 'teacher' ? `อ. ${user.name}` : `${user.name}`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 fade-in">
        {!user || !role ? (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        ) : role === 'student' ? (
          <StudentDashboard student={user} onLogout={handleLogout} />
        ) : role === 'teacher' ? (
          <TeacherDashboard teacher={user} onLogout={handleLogout} />
        ) : role === 'admin' ? (
          <AdminPanel adminUser={user} onLogout={handleLogout} />
        ) : null}
      </main>

      {/* Bottom Legal Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
          <p>© 2026 ระบบคลังหนังสือและยืม-คืนอัจฉริยะ (Smart Book Inventory System). สงวนลิขสิทธิ์ทั้งหมด</p>
          <div className="flex items-center gap-3.5 text-[11px] text-slate-400">
            <span>เซิร์ฟเวอร์หลักพอร์ต: 3000</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-500 font-semibold"><Sparkles className="w-3.5 h-3.5 text-emerald-500" /> เทคโนโลยีอัจฉริยะ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
