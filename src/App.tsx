import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import AdminPanel from './components/AdminPanel';
import { BookOpen, User, LogOut, ShieldAlert, Sparkles, Clock, ChevronDown } from 'lucide-react';

const parseStudentDept = (deptStr: string) => {
  const clean = (deptStr || '').trim();
  if (!clean || clean === 'ทั่วไป') {
    return { level: clean || 'ทั่วไป', room: '-', major: 'ทั่วไป' };
  }

  let level = '';
  let room = '-';
  let major = clean;

  const levelRegex = /(ปวช\s*\.\s*[1-3]|ปวส\s*\.\s*[1-2]|ม\s*\.\s*[1-6]|ปวช|ปวส)/i;
  const levelMatch = clean.match(levelRegex);
  if (levelMatch) {
    level = levelMatch[1].replace(/\s+/g, ''); // e.g. "ปวส.1"
    major = major.replace(levelMatch[0], '').trim();
  }

  const roomRegexes = [
    /ห้อง\s*([0-9]+\/[0-9]+)/,               // e.g. "ห้อง 1/2"
    /ห้อง\s*([0-9]+)/,                      // e.g. "ห้อง 2"
    /([0-9]+\/[0-9]+)/,                     // e.g. "1/2" or "1/3" or "1/4"
    /\/([0-9]+)/                            // e.g. "/2" as in "ปวส.1/2"
  ];

  let roomMatched = false;
  for (const regex of roomRegexes) {
    const match = major.match(regex);
    if (match) {
      room = match[1] || match[0];
      if (room.startsWith('/')) {
        const rNum = room.replace('/', '');
        const lvlNum = level.match(/\d+/);
        if (lvlNum) {
          room = `${lvlNum[0]}/${rNum}`;
        } else {
          room = rNum;
        }
      }
      major = major.replace(match[0], '').trim();
      roomMatched = true;
      break;
    }
  }

  if (!roomMatched && level) {
    const originalWithSlash = new RegExp(level.replace('.', '\\.') + '\\/([0-9]+)');
    const slashMatch = clean.match(originalWithSlash);
    if (slashMatch) {
      const rNum = slashMatch[1];
      const lvlNum = level.match(/\d+/);
      if (lvlNum) {
        room = `${lvlNum[0]}/${rNum}`;
      } else {
        room = rNum;
      }
      major = major.replace(new RegExp('\\/?' + rNum), '').trim();
      roomMatched = true;
    }
  }

  const parenRegex = /\(([^)]+)\)/;
  const parenMatch = major.match(parenRegex);
  if (parenMatch) {
    const code = parenMatch[1].trim();
    if (room === '-') {
      room = code;
    }
    if (!level) {
      const dashNum = code.match(/-([1-4][A-Z]?)$/);
      if (dashNum) {
        level = `ปี ${dashNum[1]}`;
      }
    }
    major = major.replace(parenMatch[0], '').trim();
  }

  major = major
    .replace(/\s*ห้อง\s*/g, ' ')
    .replace(/^\s*[\/\-,\(\)]+\s*|\s*[\/\-,\(\)]+\s*$/g, '')
    .trim();

  if (!level) {
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      level = parts[0].trim();
      major = parts.slice(1).join(' ').trim();
    } else {
      level = 'ทั่วไป';
      major = clean;
    }
  }

  if (!major || major === '/') {
    major = 'ทั่วไป';
  }

  if (level === 'ปวช' || level === 'ปวส') {
    if (room !== '-') {
      const firstDigit = room.match(/\d/);
      if (firstDigit) {
        level = `${level}.${firstDigit[0]}`;
      }
    }
  }

  return { level, room, major };
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'student' | 'teacher' | 'admin' | null>(null);
  const [appTime, setAppTime] = useState<string>('');
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [isStudentMenuOpen, setIsStudentMenuOpen] = useState(false);

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

  // Determine page wrapper styling dynamically to distinguish each screen
  const wrapperBgClass = 
    !user || !role ? 'bg-slate-950' :
    role === 'student' ? 'bg-emerald-50/15 text-slate-900' :
    role === 'teacher' ? 'bg-sky-50/20 text-slate-900' :
    role === 'admin' ? 'bg-slate-950 text-slate-100' :
    'bg-slate-50 text-slate-900';

  const selectionClass = 
    role === 'student' ? 'selection:bg-emerald-500/15 selection:text-emerald-800' :
    role === 'teacher' ? 'selection:bg-sky-500/15 selection:text-sky-800' :
    role === 'admin' ? 'selection:bg-rose-500/25 selection:text-rose-200' :
    'selection:bg-blue-600/10 selection:text-blue-700';

  const headerClass = 
    role === 'admin' 
      ? 'bg-slate-900 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md bg-slate-900/90 text-slate-100' 
      : 'bg-white border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md bg-white/80 text-slate-800';

  const titleTextClass = 
    role === 'admin' ? 'text-white' : 'text-slate-800';

  const subTitleTextClass = 
    role === 'admin' ? 'text-slate-400' : 'text-slate-400';

  const clockBoxClass = 
    role === 'admin' 
      ? 'hidden md:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 font-semibold' 
      : 'hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 font-semibold';

  const clockTitleClass = 
    role === 'admin' ? 'text-slate-200 font-mono' : 'text-slate-800 font-mono';

  const footerClass = 
    role === 'admin' 
      ? 'bg-slate-950 border-t border-slate-900 py-6 mt-12 text-slate-500' 
      : 'bg-white border-t border-slate-100 py-6 mt-12 text-slate-400';

  const userBadgeClass = 
    role === 'admin' 
      ? 'bg-slate-900 border border-slate-850 rounded-xl py-1.5 px-3 flex items-center gap-2 font-semibold text-slate-300' 
      : 'bg-slate-50 border border-slate-150 rounded-xl py-1.5 px-3 flex items-center gap-2 font-semibold text-slate-700';

  return (
    <div className={`min-h-screen ${wrapperBgClass} flex flex-col font-sans transition-all duration-300 ${selectionClass}`}>
      {/* Top Main Navigation Header */}
      <header className={headerClass}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${role === 'admin' ? 'bg-rose-600 shadow-lg shadow-rose-950/20' : role === 'teacher' ? 'bg-sky-600' : 'bg-emerald-600'} rounded-xl text-white shadow-sm`}>
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className={`font-extrabold ${titleTextClass} text-base font-display tracking-tight flex items-center gap-1.5`}>
                ระบบคลังหนังสือและยืม-คืนอัจฉริยะ
                {role === 'admin' ? (
                  <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-extrabold border border-rose-500/30">ADMIN MODE</span>
                ) : role === 'teacher' ? (
                  <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-extrabold border border-sky-200">TEACHER CONSOLE</span>
                ) : (
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-extrabold border border-emerald-100">STUDENT ZONE</span>
                )}
              </span>
              <p className={`text-[10px] ${subTitleTextClass} font-medium hidden sm:block`}>ตรวจสอบสถานะแบบเรียลไทม์และซิงก์ดึงข้อมูลผ่าน Google Sheets</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Real-time Clock display */}
            <div className={clockBoxClass}>
              <Clock className={`w-3.5 h-3.5 ${role === 'admin' ? 'text-rose-400' : role === 'teacher' ? 'text-sky-500' : 'text-emerald-600'}`} />
              <span>เวลาปัจจุบัน: <strong className={clockTitleClass}>{appTime}</strong></span>
            </div>

            {user && role && (
              <div className="flex items-center gap-2 text-xs relative">
                {role === 'student' ? (
                  <div className="relative">
                    <button
                      onClick={() => setIsStudentMenuOpen(!isStudentMenuOpen)}
                      className="bg-emerald-50 hover:bg-emerald-100/80 active:scale-95 border border-emerald-200 rounded-full py-1.5 px-4 flex items-center gap-2 font-bold text-emerald-800 cursor-pointer transition-all shadow-sm"
                    >
                      <User className="w-4 h-4 text-emerald-600" />
                      <span className="max-w-[120px] sm:max-w-xs truncate">
                        {user.name}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-emerald-600 transition-transform duration-200 ${isStudentMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isStudentMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-30" 
                          onClick={() => setIsStudentMenuOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2.5 z-40 animate-fadeIn">
                          {(() => {
                            const parsedDept = parseStudentDept(user.department);
                            return (
                              <div className="px-4 py-2 border-b border-slate-50 mb-1.5">
                                <p className="font-extrabold text-slate-800 text-sm truncate">{user.name}</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">รหัส: {user.id}</p>
                                <p className="text-[10px] text-slate-500 font-bold truncate">ระดับชั้น: {parsedDept.level} (ห้อง: {parsedDept.room})</p>
                                {parsedDept.major !== 'ทั่วไป' && (
                                  <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{parsedDept.major}</p>
                                )}
                              </div>
                            );
                          })()}
                          
                          <button
                            onClick={() => {
                              setIsStudentMenuOpen(false);
                              setShowStudentProfile(true);
                            }}
                            className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition-all text-xs cursor-pointer"
                          >
                            <User className="w-4 h-4 text-emerald-600" />
                            <span>ดู/แก้ไขข้อมูลส่วนตัว (Edit Profile)</span>
                          </button>

                          <div className="border-t border-slate-100 my-1.5"></div>

                          <button
                            onClick={() => {
                              setIsStudentMenuOpen(false);
                              handleLogout();
                            }}
                            className="w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50/50 font-bold flex items-center gap-2.5 transition-all text-xs cursor-pointer"
                          >
                            <LogOut className="w-4 h-4 text-rose-500" />
                            <span>ออกจากระบบ (Logout)</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className={userBadgeClass}>
                    {role === 'admin' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
                    ) : (
                      <User className="w-4 h-4 text-sky-600" />
                    )}
                    <span className="max-w-[120px] sm:max-w-xs truncate font-bold text-xs">
                      {role === 'admin' ? 'ผู้ดูแลระบบสูงสุด' : role === 'teacher' ? `อาจารย์ ${user.name}` : `${user.name}`}
                    </span>
                  </div>
                )}
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
          <StudentDashboard 
            student={user} 
            onLogout={handleLogout} 
            forceOpenProfile={showStudentProfile}
            onCloseProfile={() => setShowStudentProfile(false)}
            onProfileUpdate={(updatedUser) => {
              setUser(updatedUser);
              localStorage.setItem('attendance_user', JSON.stringify(updatedUser));
            }}
          />
        ) : role === 'teacher' ? (
          <TeacherDashboard 
            teacher={user} 
            onLogout={handleLogout}
            onProfileUpdate={(updatedUser) => {
              setUser(updatedUser);
              localStorage.setItem('attendance_user', JSON.stringify(updatedUser));
            }}
          />
        ) : role === 'admin' ? (
          <AdminPanel adminUser={user} onLogout={handleLogout} />
        ) : null}
      </main>

      {/* Bottom Legal Footer */}
      <footer className={footerClass}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium">
          <p>© 2026 ระบบคลังหนังสือและยืม-คืนอัจฉริยะ (Smart Book Inventory System). สงวนลิขสิทธิ์ทั้งหมด</p>
          <div className="flex items-center gap-3.5 text-[11px]">
            <span>เซิร์ฟเวอร์หลักพอร์ต: 3000</span>
            <span>•</span>
            <span className="flex items-center gap-1 font-semibold">
              <Sparkles className={`w-3.5 h-3.5 ${role === 'admin' ? 'text-rose-400' : role === 'teacher' ? 'text-sky-500' : 'text-emerald-500'}`} /> 
              ระบบระบุสีเอกลักษณ์ประจำสิทธิ์การใช้งาน
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
