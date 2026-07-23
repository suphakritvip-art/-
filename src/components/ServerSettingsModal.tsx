import React, { useState, useEffect } from 'react';
import { 
  X, Server, ShieldAlert, Cpu, Key, Database, RefreshCw, 
  LogIn, CheckCircle2, AlertCircle, Users, BookOpen, Download, 
  Upload, Trash2, Eye, EyeOff, Save, ShieldCheck, Activity, HardDrive
} from 'lucide-react';
import { Teacher, Student, Book, AdminUser } from '../types';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDirectLogin: (user: any, role: string) => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  isOpen,
  onClose,
  onDirectLogin
}) => {
  const [activeTab, setActiveTab] = useState<'bypass' | 'health' | 'admins' | 'teachers' | 'students' | 'backup' | 'credentials'>('bypass');

  // Stats & Health
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'error'>('checking');
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Lists
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  // Admin Google Sheets Import & Form
  const [adminSheetUrl, setAdminSheetUrl] = useState('');
  const [adminImportLoading, setAdminImportLoading] = useState(false);
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminPos, setNewAdminPos] = useState('');

  // Password Edit State
  const [selectedTeacherUser, setSelectedTeacherUser] = useState<string>('');
  const [teacherNewPass, setTeacherNewPass] = useState<string>('');

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentNewPass, setStudentNewPass] = useState<string>('');

  // Backup / Restore JSON
  const [rawDbJson, setRawDbJson] = useState<string>('');
  const [uploadJsonText, setUploadJsonText] = useState<string>('');

  // Status Messages
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadServerData();
    }
  }, [isOpen]);

  const loadServerData = async () => {
    setLoading(true);
    const startTime = performance.now();
    try {
      const [resStats, resTeachers, resStudents, resBooks, resAdmins] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/teachers'),
        fetch('/api/students'),
        fetch('/api/books'),
        fetch('/api/admins')
      ]);

      const endTime = performance.now();
      setPingMs(Math.round(endTime - startTime));

      if (resStats.ok) setStats(await resStats.json());
      if (resTeachers.ok) setTeachers(await resTeachers.json());
      if (resStudents.ok) setStudents(await resStudents.json());
      if (resBooks.ok) setBooks(await resBooks.json());
      if (resAdmins.ok) {
        const adminData = await resAdmins.json();
        setAdmins(adminData.admins || []);
      }

      setServerStatus('online');
    } catch (err) {
      console.error('Error pinging server:', err);
      setServerStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminImportSheets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSheetUrl.trim()) {
      setMessage({ type: 'error', text: 'กรุณากรอกลิงก์ Google Sheets สำหรับข้อมูลผู้ดูแลระบบ (Admin)' });
      return;
    }
    setAdminImportLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admins/import-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: adminSheetUrl })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setAdminSheetUrl('');
        setAdmins(data.admins || []);
      } else {
        setMessage({ type: 'error', text: data.message || 'ไม่สามารถดึงข้อมูล Admin จาก Google Sheets ได้' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google Sheets' });
    } finally {
      setAdminImportLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUser.trim() || !newAdminName.trim()) {
      setMessage({ type: 'error', text: 'กรุณากรอก Username และชื่อ-นามสกุล' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newAdminUser,
          name: newAdminName,
          password: newAdminPass,
          position: newAdminPos
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'เพิ่มบัญชีผู้ดูแลระบบสำเร็จ!' });
        setNewAdminUser('');
        setNewAdminName('');
        setNewAdminPass('');
        setNewAdminPos('');
        setAdmins(data.admins || []);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเพิ่มผู้ดูแลระบบ' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (username: string) => {
    if (!confirm(`ยืนยันลบบัญชีผู้ดูแลระบบ ${username}?`)) return;
    try {
      const res = await fetch(`/api/admins/${encodeURIComponent(username)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'ลบบัญชี Admin สำเร็จ' });
        setAdmins(data.admins || []);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'ไม่สามารถลบ Admin ได้' });
    }
  };

  const handleFetchRawDb = async () => {
    try {
      const res = await fetch('/api/admin/raw-db');
      const data = await res.json();
      if (data.success) {
        setRawDbJson(JSON.stringify(data.db, null, 2));
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'ไม่สามารถดึงข้อมูลดิบของฐานข้อมูลได้' });
    }
  };

  const handleRestoreRawDb = async () => {
    if (!uploadJsonText.trim()) {
      setMessage({ type: 'error', text: 'กรุณาวางโค้ด JSON ข้อมูลฐานข้อมูลก่อนกู้คืน' });
      return;
    }

    try {
      const parsed = JSON.parse(uploadJsonText);
      const res = await fetch('/api/admin/raw-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDb: parsed })
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'กู้คืนฐานข้อมูลจากไฟล์ JSON เรียบร้อยแล้ว!' });
        loadServerData();
        setUploadJsonText('');
      } else {
        setMessage({ type: 'error', text: data.message || 'โครงสร้างข้อมูลไม่ถูกต้อง' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'รูปแบบ JSON ไม่ถูกต้อง: ' + err.message });
    }
  };

  const handleUpdateTeacherPass = async (username: string) => {
    if (!teacherNewPass.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/teachers/${username}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: teacherNewPass.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `เปลี่ยนรหัสผ่านของคุณครู ${username} สำเร็จ` });
        setTeacherNewPass('');
        setSelectedTeacherUser('');
        loadServerData();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStudentPass = async (studentId: string) => {
    if (!studentNewPass.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/students/${studentId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: studentNewPass.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `เปลี่ยนรหัสผ่านของนักเรียน ${studentId} สำเร็จ` });
        setStudentNewPass('');
        setSelectedStudentId('');
        loadServerData();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตฐานข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้น?')) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/reset-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmCode: '12102548' })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'รีเซ็ตระบบเป็นค่าเริ่มต้นเรียบร้อยแล้ว!' });
        loadServerData();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการส่งคำสั่งรีเซ็ต' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* HEADER BANNER */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 p-5 sm:p-6 border-b border-slate-800 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700 rounded-full text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <Server className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  ไม่ต้องผ่านการล็อกอิน (Direct Access)
                </span>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-mono">
                  Port: 3000
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-1 text-white">
                ตั้งค่าเซิร์ฟเวอร์ & ควบคุมระบบ Admin
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ศูนย์จัดการฐานข้อมูล รีเซ็ตรหัสผ่านครู/นักเรียน และทางลัดเข้าสู่ระบบแอดมินโดยตรง
              </p>
            </div>
          </div>

          {/* TAB BAR */}
          <div className="flex border-b border-slate-800 mt-6 gap-1 overflow-x-auto pb-0">
            <button
              onClick={() => { setActiveTab('bypass'); setMessage(null); }}
              className={`pb-2.5 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'bypass'
                  ? 'border-indigo-500 text-indigo-400 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" /> ⚡ เข้าแอดมินทันที
            </button>
            <button
              onClick={() => { setActiveTab('health'); setMessage(null); }}
              className={`pb-2.5 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'health'
                  ? 'border-indigo-500 text-indigo-400 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" /> สถานะเซิร์ฟเวอร์
            </button>
            <button
              onClick={() => { setActiveTab('admins'); setMessage(null); }}
              className={`pb-2.5 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'admins'
                  ? 'border-indigo-500 text-indigo-400 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-400" /> ดึง Admin จาก Google Sheets ({admins.length})
            </button>
            <button
              onClick={() => { setActiveTab('teachers'); setMessage(null); }}
              className={`pb-2.5 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'teachers'
                  ? 'border-indigo-500 text-indigo-400 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4 text-rose-400" /> ครู & แก้รหัสผ่าน ({teachers.length})
            </button>
            <button
              onClick={() => { setActiveTab('students'); setMessage(null); }}
              className={`pb-2.5 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'students'
                  ? 'border-indigo-500 text-indigo-400 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" /> นักเรียน ({students.length})
            </button>
            <button
              onClick={() => { setActiveTab('backup'); setMessage(null); }}
              className={`pb-2.5 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'backup'
                  ? 'border-indigo-500 text-indigo-400 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-4 h-4 text-amber-400" /> สำรอง / รีเซ็ต DB
            </button>
            <button
              onClick={() => { setActiveTab('credentials'); setMessage(null); }}
              className={`pb-2.5 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'credentials'
                  ? 'border-indigo-500 text-indigo-400 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key className="w-4 h-4 text-cyan-400" /> สรุปรหัสผ่านทั้งหมด
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">

          {/* Alert Message */}
          {message && (
            <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-fadeIn ${
              message.type === 'success' 
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80' 
                : 'bg-rose-950/60 text-rose-300 border-rose-800/80'
            }`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />}
                <span>{message.text}</span>
              </div>
              <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white text-xs underline cursor-pointer">
                ปิด
              </button>
            </div>
          )}

          {/* TAB 1: BYPASS ADMIN ACCESS */}
          {activeTab === 'bypass' && (
            <div className="space-y-5">
              <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-800/50 rounded-2xl p-6 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-3xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">ทางลัดเข้าสู่ระบบแอดมินโดยตรง (Direct Admin Login)</h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
                    คลิกปุ่มด้านล่างเพื่อเข้าสู่หน้าจอควบคุมหลักของผู้ดูแลระบบสูงสุด (Super Admin) ทันที โดยไม่ต้องพิมพ์รหัสผ่าน
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onDirectLogin({ id: 'admin', username: 'Admin', name: 'ผู้ดูแลระบบสูงสุด (Super Admin)' }, 'admin');
                      onClose();
                    }}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-3 mx-auto transform hover:scale-105"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>เข้าสู่ระบบแอดมินทันที (Bypass Admin Login)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 space-y-2">
                  <div className="font-bold text-indigo-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    บัญชีผู้ดูแลระบบ
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    มีแอดมินทั้งหมด <span className="text-emerald-400 font-bold">{admins.length}</span> บัญชีในระบบ<br />
                    สามารถดึงข้อมูลเพิ่มเติมได้จาก Google Sheets
                  </p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 space-y-2">
                  <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <Server className="w-4 h-4" />
                    สภาพแวดล้อมระบบ
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Node.js Express + React Vite<br />
                    Port: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300 font-mono">3000</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ADMINS & GOOGLE SHEETS */}
          {activeTab === 'admins' && (
            <div className="space-y-5">
              {/* Google Sheets Admin Import Box */}
              <div className="bg-gradient-to-r from-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">ดึงข้อมูลผู้ดูแลระบบ (Admin) จาก Google Sheets</h3>
                    <p className="text-[11px] text-slate-400">วางลิงก์ Google Sheet เพื่อนำเข้ารายชื่อ Admin พร้อมรหัสผ่านเข้าสู่ระบบทันที</p>
                  </div>
                </div>

                <form onSubmit={handleAdminImportSheets} className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="url"
                    required
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    value={adminSheetUrl}
                    onChange={(e) => setAdminSheetUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={adminImportLoading}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {adminImportLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>ดึงข้อมูล Admin</span>
                  </button>
                </form>
                <p className="text-[10px] text-slate-400">
                  💡 *หมายเหตุ:* รองรับคอลัมน์ <code className="text-emerald-300 font-mono">Username</code>, <code className="text-emerald-300 font-mono">Name</code> (ชื่อ-นามสกุล), <code className="text-emerald-300 font-mono">Password</code>, และ <code className="text-emerald-300 font-mono">Position</code>
                </p>
              </div>

              {/* Add New Admin Manually */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                  <Key className="w-4 h-4" /> เพิ่มผู้ดูแลระบบใหม่ (สร้างเอง)
                </h4>
                <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Username (ภาษาอังกฤษ)"
                    value={newAdminUser}
                    onChange={(e) => setNewAdminUser(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="ชื่อ-นามสกุล"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="ตำแหน่ง (เช่น Admin ห้องสมุด)"
                    value={newAdminPos}
                    onChange={(e) => setNewAdminPos(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="รหัสผ่าน"
                    value={newAdminPass}
                    onChange={(e) => setNewAdminPass(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      + บันทึกเพิ่มบัญชี Admin
                    </button>
                  </div>
                </form>
              </div>

              {/* Admin Accounts List */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-300">
                  รายชื่อผู้ดูแลระบบทั้งหมด ({admins.length} บัญชี)
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {admins.map(adm => (
                    <div key={adm.username} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{adm.name}</span>
                          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-mono">
                            @{adm.username}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          ตำแหน่ง: {adm.position || 'ผู้ดูแลระบบ'} {adm.email && `| Email: ${adm.email}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            onDirectLogin({ id: adm.id || adm.username, username: adm.username, name: adm.name, position: adm.position }, 'admin');
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                        >
                          <LogIn className="w-3.5 h-3.5" /> ล็อกอินด้วยบัญชีนี้
                        </button>
                        {adm.username.toLowerCase() !== 'admin' && (
                          <button
                            onClick={() => handleDeleteAdmin(adm.username)}
                            className="p-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-lg transition-all cursor-pointer"
                            title="ลบบัญชีนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SERVER HEALTH & STATS */}
          {activeTab === 'health' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${serverStatus === 'online' ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`}></div>
                  <div>
                    <div className="font-bold text-sm text-white">
                      สถานะการเชื่อมต่อ: {serverStatus === 'online' ? 'ออนไลน์ (Online)' : 'ขัดข้อง (Offline)'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ความเร็วการตอบสนอง (Latency): {pingMs !== null ? `${pingMs} ms` : 'กำลังวัด...'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={loadServerData}
                  disabled={loading}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  ทดสอบการเชื่อมต่อ
                </button>
              </div>

              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 block mb-1">หนังสือทั้งหมดในระบบ</span>
                    <span className="text-xl font-black text-indigo-400">{stats.totalBooks} รายการ</span>
                  </div>
                  <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 block mb-1">จำนวนหนังสือรับเข้า</span>
                    <span className="text-xl font-black text-emerald-400">{stats.totalReceived} เล่ม</span>
                  </div>
                  <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 block mb-1">แจกจ่าย/ยืมไปแล้ว</span>
                    <span className="text-xl font-black text-rose-400">{stats.totalGivenOut} เล่ม</span>
                  </div>
                  <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 block mb-1">คงเหลือพร้อมจ่าย</span>
                    <span className="text-xl font-black text-amber-400">{stats.totalAvailable} เล่ม</span>
                  </div>
                  <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 block mb-1">จำนวนคุณครู</span>
                    <span className="text-xl font-black text-cyan-400">{teachers.length} ท่าน</span>
                  </div>
                  <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 block mb-1">จำนวนนักเรียน</span>
                    <span className="text-xl font-black text-teal-400">{students.length} คน</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEACHERS & PASSWORDS */}
          {activeTab === 'teachers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-rose-400" />
                  รายชื่อคุณครูและการเปลี่ยนรหัสผ่าน ({teachers.length} ท่าน)
                </h3>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {teachers.map(t => (
                  <div key={t.username} className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">{t.name}</span>
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded font-mono text-[10px]">
                          Username: {t.username}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        ตำแหน่ง: {t.position || '-'} | สาขา: {t.department || '-'} | วันเกิด: {t.birthdate || '-'}
                      </div>
                      <div className="text-slate-300 font-mono text-[11px] mt-1 bg-slate-900/80 px-2 py-1 rounded inline-block">
                        รหัสผ่านปัจจุบัน: <strong className="text-rose-400">{t.password || t.birthdate || '123'}</strong>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto flex items-center gap-2">
                      {selectedTeacherUser === t.username ? (
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                          <input
                            type="text"
                            placeholder="รหัสผ่านใหม่..."
                            value={teacherNewPass}
                            onChange={(e) => setTeacherNewPass(e.target.value)}
                            className="px-2.5 py-1.5 bg-slate-900 border border-rose-500/60 rounded-xl text-xs text-white focus:outline-none w-32"
                          />
                          <button
                            onClick={() => handleUpdateTeacherPass(t.username)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                          >
                            บันทึก
                          </button>
                          <button
                            onClick={() => setSelectedTeacherUser('')}
                            className="px-2 py-1.5 bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedTeacherUser(t.username);
                            setTeacherNewPass(t.birthdate || '123');
                          }}
                          className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Key className="w-3.5 h-3.5" /> แก้ไขรหัสผ่าน
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: STUDENTS & PASSWORDS */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  รายชื่อนักเรียนนักศึกษา ({students.length} คน)
                </h3>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {students.map(s => (
                  <div key={s.id} className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">{s.name}</span>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono text-[10px]">
                          รหัส: {s.id}
                        </span>
                        {s.isRegistered ? (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px]">ลงทะเบียนแล้ว</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px]">ยังไม่ลงทะเบียน</span>
                        )}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        ห้อง/สาขา: {s.department || '-'} | วันเกิด: {s.birthdate || '-'}
                      </div>
                      <div className="text-slate-300 font-mono text-[11px] mt-1 bg-slate-900/80 px-2 py-1 rounded inline-block">
                        รหัสผ่าน: <strong className="text-emerald-400">{s.password || s.birthdate || '123'}</strong>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto flex items-center gap-2">
                      {selectedStudentId === s.id ? (
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                          <input
                            type="text"
                            placeholder="รหัสผ่านใหม่..."
                            value={studentNewPass}
                            onChange={(e) => setStudentNewPass(e.target.value)}
                            className="px-2.5 py-1.5 bg-slate-900 border border-emerald-500/60 rounded-xl text-xs text-white focus:outline-none w-32"
                          />
                          <button
                            onClick={() => handleUpdateStudentPass(s.id)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                          >
                            บันทึก
                          </button>
                          <button
                            onClick={() => setSelectedStudentId('')}
                            className="px-2 py-1.5 bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedStudentId(s.id);
                            setStudentNewPass('123');
                          }}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Key className="w-3.5 h-3.5" /> แก้ไขรหัสผ่าน
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: BACKUP / RESTORE / RESET */}
          {activeTab === 'backup' && (
            <div className="space-y-5 text-xs">
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-3">
                <div className="font-extrabold text-sm text-amber-400 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  ดึงและดาวน์โหลดไฟล์สำรองข้อมูล (Export DB JSON)
                </div>
                <p className="text-slate-300 text-[11px]">
                  เรียกดูหรือคัดลอกโครงสร้างฐานข้อมูลหนังสือ ครู นักเรียน และรายการยืม-คืนในรูปแบบ JSON
                </p>
                <button
                  onClick={handleFetchRawDb}
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" /> แสดงโค้ดฐานข้อมูลปัจจุบัน
                </button>

                {rawDbJson && (
                  <textarea
                    readOnly
                    value={rawDbJson}
                    rows={6}
                    className="w-full p-3 bg-slate-950 font-mono text-[11px] text-amber-300 rounded-xl border border-slate-800 focus:outline-none"
                  />
                )}
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-3">
                <div className="font-extrabold text-sm text-cyan-400 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  กู้คืนข้อมูลจากโค้ด JSON (Restore DB JSON)
                </div>
                <p className="text-slate-300 text-[11px]">
                  วางโค้ด JSON เพื่อเขียนทับฐานข้อมูลในระบบ
                </p>
                <textarea
                  placeholder="วางโค้ด JSON ที่นี่..."
                  value={uploadJsonText}
                  onChange={(e) => setUploadJsonText(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-slate-950 font-mono text-[11px] text-slate-100 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleRestoreRawDb}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" /> บันทึกกู้คืนข้อมูล
                </button>
              </div>

              <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-4 space-y-3">
                <div className="font-extrabold text-sm text-rose-400 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  รีเซ็ตระบบเป็นค่าเริ่มต้น (Reset DB to Default)
                </div>
                <p className="text-slate-300 text-[11px]">
                  รีเซ็ตรายชื่อหนังสือ ครู และนักเรียนทั้งหมดให้กลับเป็นชุดข้อมูลตั้งต้น
                </p>
                <button
                  onClick={handleResetDatabase}
                  disabled={loading}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-lg cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  รีเซ็ตระบบทันที
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: SYSTEM CREDENTIALS SUMMARY */}
          {activeTab === 'credentials' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-3">
                <h3 className="font-extrabold text-sm text-cyan-400 flex items-center gap-2">
                  <Key className="w-4 h-4" /> สรุปรหัสผ่านและผู้ใช้งานทั้งหมดในระบบ
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 font-bold">
                        <th className="p-2">บทบาท</th>
                        <th className="p-2">Username / ID</th>
                        <th className="p-2">ชื่อ - นามสกุล</th>
                        <th className="p-2">รหัสผ่านสำหรับเข้าใช้งาน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      <tr className="bg-indigo-950/30">
                        <td className="p-2 font-bold text-indigo-400">ADMIN</td>
                        <td className="p-2 font-bold text-white">admin</td>
                        <td className="p-2 font-sans text-slate-300">ผู้ดูแลระบบสูงสุด</td>
                        <td className="p-2 text-amber-300 font-bold">254812</td>
                      </tr>
                      {teachers.map(t => (
                        <tr key={t.username}>
                          <td className="p-2 font-bold text-rose-400">TEACHER</td>
                          <td className="p-2 text-white">{t.username}</td>
                          <td className="p-2 font-sans text-slate-300">{t.name}</td>
                          <td className="p-2 text-emerald-300 font-bold">{t.password || t.birthdate || '123'}</td>
                        </tr>
                      ))}
                      {students.map(s => (
                        <tr key={s.id}>
                          <td className="p-2 font-bold text-emerald-400">STUDENT</td>
                          <td className="p-2 text-white">{s.id}</td>
                          <td className="p-2 font-sans text-slate-300">{s.name}</td>
                          <td className="p-2 text-emerald-300 font-bold">{s.password || s.birthdate || '123'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            ระบบตั้งค่าเซิร์ฟเวอร์โดยตรง • สิทธิระดับ Super Admin
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl cursor-pointer transition-all"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
