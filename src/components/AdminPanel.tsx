import React, { useState, useEffect } from 'react';
import { Student, Teacher, Book, BookTransaction } from '../types';
import { 
  ShieldAlert, Users, School, BookOpen, Trash2, Key, CheckCircle2, 
  AlertCircle, Loader2, LogOut, RefreshCw, RefreshCw as ResetIcon, Plus,
  Database, Info, AlertTriangle, FileSpreadsheet, Check, X, Sparkles, BookMarked,
  Search, HeartHandshake, Undo2
} from 'lucide-react';

interface AdminPanelProps {
  adminUser: { username: string; name: string };
  onLogout: () => void;
}

const parseStudentDept = (deptStr: string) => {
  const clean = (deptStr || '').trim();
  if (!clean || clean === 'ทั่วไป') {
    return { level: clean || 'ทั่วไป', room: '-', major: 'ทั่วไป' };
  }

  // Check if it has a slash e.g. "ม.4/1" or "ปวช.1/2 ช่างยนต์" or "ม.4/2 ทั่วไป"
  const regex = /^([^/]+)\/([^/\s]+)(?:\s+(.+))?$/;
  const match = clean.match(regex);
  if (match) {
    return {
      level: match[1].trim(),
      room: match[2].trim(),
      major: (match[3] || 'ทั่วไป').trim()
    };
  }

  // Fallback if no slash: check if it has space
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return {
      level: parts[0].trim(),
      room: '-',
      major: parts.slice(1).join(' ').trim()
    };
  }

  return {
    level: clean,
    room: '-',
    major: 'ทั่วไป'
  };
};

export default function AdminPanel({ adminUser, onLogout }: AdminPanelProps) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalBooks: 0,
    totalReceived: 0,
    totalGivenOut: 0,
    totalStock: 0,
    activeBorrows: 0,
    pendingBorrows: 0
  });
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<BookTransaction[]>([]);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'teachers' | 'students' | 'books' | 'approvals'>('teachers');

  // Book and student search query state
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Google Sheets state variables for students
  const [showStudentImportForm, setShowStudentImportForm] = useState(false);
  const [studentSheetUrl, setStudentSheetUrl] = useState('');
  const [studentImportLoading, setStudentImportLoading] = useState(false);

  // Google Sheets state variables for teachers
  const [showTeacherImportForm, setShowTeacherImportForm] = useState(false);
  const [teacherSheetUrl, setTeacherSheetUrl] = useState('');
  const [teacherImportLoading, setTeacherImportLoading] = useState(false);

  // Form for creating teacher
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherUser, setTeacherUser] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherPosition, setTeacherPosition] = useState('');
  const [teacherPass, setTeacherPass] = useState('');

  // Form for creating student
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentLevel, setStudentLevel] = useState('');
  const [studentRoom, setStudentRoom] = useState('');
  const [studentMajor, setStudentMajor] = useState('');

  // Reset database state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetCode, setResetCode] = useState('');

  // Google Sheets state variables in Admin Panel
  const [showImportForm, setShowImportForm] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  // Cover image inline editing state variables in Admin Panel
  const [editingCoverBookId, setEditingCoverBookId] = useState<string | null>(null);
  const [tempCoverUrl, setTempCoverUrl] = useState('');

  // Status Alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleGoogleSheetsImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl) {
      showAlert('error', 'กรุณากรอกลิงก์ Google Sheets');
      return;
    }

    setImportLoading(true);
    try {
      const res = await fetch('/api/books/import-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', data.message);
        setSheetUrl('');
        setShowImportForm(false);
        loadAllData();
      } else {
        showAlert('error', data.message || 'ไม่สามารถนำเข้าข้อมูลได้ ตรวจสอบสิทธิ์ชีตและชื่อคอลัมน์');
      }
    } catch (err) {
      showAlert('error', 'ล้มเหลวในการเชื่อมต่อเซิร์ฟเวอร์นำเข้า');
    } finally {
      setImportLoading(false);
    }
  };

  const handleStudentGoogleSheetsImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentSheetUrl) {
      showAlert('error', 'กรุณากรอกลิงก์ Google Sheets สำหรับรายชื่อนักเรียน');
      return;
    }

    setStudentImportLoading(true);
    try {
      const res = await fetch('/api/students/import-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: studentSheetUrl })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', data.message);
        setStudentSheetUrl('');
        setShowStudentImportForm(false);
        loadAllData();
      } else {
        showAlert('error', data.message || 'ไม่สามารถนำเข้าข้อมูลได้ ตรวจสอบสิทธิ์ชีตและชื่อคอลัมน์');
      }
    } catch (err) {
      showAlert('error', 'ล้มเหลวในการเชื่อมต่อเซิร์ฟเวอร์นำเข้า');
    } finally {
      setStudentImportLoading(false);
    }
  };

  const handleTeacherGoogleSheetsImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherSheetUrl) {
      showAlert('error', 'กรุณากรอกลิงก์ Google Sheets สำหรับรายชื่อคุณครู/อาจารย์');
      return;
    }

    setTeacherImportLoading(true);
    try {
      const res = await fetch('/api/teachers/import-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: teacherSheetUrl })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', data.message);
        setTeacherSheetUrl('');
        setShowTeacherImportForm(false);
        loadAllData();
      } else {
        showAlert('error', data.message || 'ไม่สามารถนำเข้าข้อมูลได้ ตรวจสอบสิทธิ์ชีตและชื่อคอลัมน์');
      }
    } catch (err) {
      showAlert('error', 'ล้มเหลวในการเชื่อมต่อเซิร์ฟเวอร์นำเข้า');
    } finally {
      setTeacherImportLoading(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [resStats, resTeachers, resStudents, resBooks, resTx] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/teachers'),
        fetch('/api/students'),
        fetch('/api/books'),
        fetch('/api/transactions')
      ]);

      if (resStats.ok) {
        const statsData = await resStats.json();
        setStats(statsData);
      }
      if (resTeachers.ok) {
        setTeachers(await resTeachers.json());
      }
      if (resStudents.ok) {
        setStudents(await resStudents.json());
      }
      if (resBooks.ok) {
        setBooks(await resBooks.json());
      }
      if (resTx.ok) {
        setTransactions(await resTx.json());
      }
    } catch (err) {
      console.error(err);
      showAlert('error', 'ล้มเหลวในการเชื่อมโยงข้อมูลเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Register a new teacher account
  const handleAddTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherUser || !teacherName || !teacherPass) {
      showAlert('error', 'กรุณากรอกข้อมูลครูอาจารย์ให้ครบถ้วน');
      return;
    }

    setActionLoading('add_teacher');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: teacherUser,
          name: teacherName,
          position: teacherPosition || 'คุณครู',
          password: teacherPass,
          role: 'teacher'
        })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'ลงทะเบียนและสร้างบัญชีคุณครูเรียบร้อยแล้ว');
        setTeacherUser('');
        setTeacherName('');
        setTeacherPosition('');
        setTeacherPass('');
        setShowAddTeacher(false);
        loadAllData();
      } else {
        showAlert('error', data.message || 'สร้างผู้สอนล้มเหลว');
      }
    } catch (err) {
      showAlert('error', 'เชื่อมโยงไม่สำเร็จ');
    } finally {
      setActionLoading(null);
    }
  };

  // Add Student manually as Admin
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !studentName || !studentLevel) {
      showAlert('error', 'กรุณากรอกข้อมูลนักเรียนให้ครบถ้วน (รหัสนักศึกษา, ชื่อจริง, ระดับชั้น)');
      return;
    }

    const combinedDept = `${studentLevel}/${studentRoom || '-'} ${studentMajor || 'ทั่วไป'}`.trim();

    setActionLoading('add_student');
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: studentId,
          name: studentName,
          department: combinedDept
        })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'บันทึกรายชื่อนักเรียนคนใหม่เรียบร้อยแล้ว');
        setStudentId('');
        setStudentName('');
        setStudentLevel('');
        setStudentRoom('');
        setStudentMajor('');
        setShowAddStudent(false);
        loadAllData();
      } else {
        showAlert('error', data.message || 'บันทึกนักเรียนไม่สำเร็จ');
      }
    } catch (err) {
      showAlert('error', 'เกิดปัญหาทางเครือข่าย');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Teacher account
  const handleDeleteTeacher = async (username: string) => {
    if (!window.confirm(`คุณแน่ใจว่าต้องการลบบัญชีผู้สอนของ ${username} หรือไม่?`)) return;
    
    setActionLoading(username);
    try {
      const res = await fetch(`/api/teachers/${username}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('success', 'ลบบัญชีผู้ใช้ครูสำเร็จแล้ว');
        loadAllData();
      } else {
        showAlert('error', 'ลบผู้สอนไม่สำเร็จ');
      }
    } catch (err) {
      showAlert('error', 'เชื่อมโยงขัดข้อง');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Student account & credentials
  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm(`คุณแน่ใจว่าต้องการลบข้อมูลและประวัติยืมทั้งหมดของนักเรียนรหัส ${id} หรือไม่?`)) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('success', 'ลบข้อมูลและบัญชีนักเรียนรายนี้สำเร็จแล้ว');
        loadAllData();
      } else {
        showAlert('error', 'ไม่สามารถลบนักเรียนได้');
      }
    } catch (err) {
      showAlert('error', 'เชื่อมโยงขัดข้อง');
    } finally {
      setActionLoading(null);
    }
  };

  // Approve a borrow loan request
  const handleApproveBorrow = async (txId: string) => {
    setActionLoading(txId);
    try {
      const res = await fetch(`/api/transactions/${txId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: adminUser.name })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'อนุมัติการยืมหนังสือสำเร็จเรียบร้อย');
        loadAllData();
      } else {
        showAlert('error', data.message || 'อนุมัติคำขอยืมล้มเหลว');
      }
    } catch (err) {
      showAlert('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setActionLoading(null);
    }
  };

  // Reject a borrow request
  const handleRejectBorrow = async (txId: string) => {
    const reason = window.prompt('ระบุเหตุผลในการปฏิเสธการยืม (หากไม่มีให้เว้นว่างไว้):');
    if (reason === null) return; // cancelled

    setActionLoading(txId);
    try {
      const res = await fetch(`/api/transactions/${txId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: adminUser.name, notes: reason || 'ผู้ดูแลระบบปฏิเสธคำขอ' })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'ปฏิเสธคำขอยืมเรียบร้อยแล้ว');
        loadAllData();
      } else {
        showAlert('error', data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      showAlert('error', 'เชื่อมต่อระบบมีปัญหา');
    } finally {
      setActionLoading(null);
    }
  };

  // Return a borrowed book back to stock
  const handleReturnBook = async (txId: string) => {
    setActionLoading(txId);
    try {
      const res = await fetch(`/api/transactions/${txId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: adminUser.name })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'บันทึกส่งคืนหนังสือเข้าคลังเรียบร้อยแล้ว!');
        loadAllData();
      } else {
        showAlert('error', data.message || 'บันทึกคืนหนังสือล้มเหลว');
      }
    } catch (err) {
      showAlert('error', 'เกิดข้อผิดพลาดในการคืนหนังสือ');
    } finally {
      setActionLoading(null);
    }
  };

  // Database hard reset
  const handleResetDBSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetCode !== '44120') {
      showAlert('error', 'รหัสยืนยันไม่ถูกต้อง');
      return;
    }

    setActionLoading('reset');
    try {
      const res = await fetch('/api/admin/reset-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmCode: 'RESET-44120' })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'ล้างข้อมูลสำมะโนและประวัติยืมกลับเป็นข้อมูลพรีเซ็ตสำเร็จแล้ว!');
        setShowResetConfirm(false);
        setResetCode('');
        loadAllData();
      } else {
        showAlert('error', data.message || 'ล้างระบบล้มเหลว');
      }
    } catch (err) {
      showAlert('error', 'เชื่อมต่อขัดข้อง');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingRequests = transactions.filter(t => t.status === 'pending' && t.type === 'borrow');
  const activeBorrows = transactions.filter(t => t.status === 'approved' && t.type === 'borrow');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Admin Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-rose-900/20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/30 text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <span className="bg-rose-500/20 text-rose-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-rose-500/30">
              บทบาทสูงสุด: ผู้ดูแลระบบส่วนกลาง (Super Admin)
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-wide mt-1">แผงควบคุมระบบหนังสือและสมาชิกส่วนกลาง</h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
              ผู้จัดการสูงสุด: <strong>{adminUser.name}</strong> | ควบคุม บัญชีอาจารย์, รายชื่อนักเรียน, และทำการคืนค่าโรงงานฐานข้อมูล
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            onClick={loadAllData}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white border border-slate-700 rounded-xl transition-all cursor-pointer"
            title="รีเฟรชฐานข้อมูลทั้งหมด"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/35 text-rose-200 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* Library Stats Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs text-center">
          <p className="text-[10px] text-slate-400 font-bold">อาจารย์ผู้สอน</p>
          <p className="text-lg font-black text-slate-800">{stats.totalTeachers} บัญชี</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs text-center">
          <p className="text-[10px] text-slate-400 font-bold">นักเรียนสะสม</p>
          <p className="text-lg font-black text-slate-800">{stats.totalStudents} คน</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs text-center">
          <p className="text-[10px] text-slate-400 font-bold">จำนวนประเภทหนังสือ</p>
          <p className="text-lg font-black text-indigo-600">{stats.totalBooks} รายการ</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs text-center">
          <p className="text-[10px] text-slate-400 font-bold">นำเข้าทั้งหมด</p>
          <p className="text-lg font-black text-emerald-600">{stats.totalReceived} เล่ม</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs text-center">
          <p className="text-[10px] text-slate-400 font-bold">แจกขาดออกไป</p>
          <p className="text-lg font-black text-blue-600">{stats.totalGivenOut} เล่ม</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs text-center">
          <p className="text-[10px] text-slate-400 font-bold">คงคลังปัจจุบัน</p>
          <p className="text-lg font-black text-teal-600">{stats.totalStock} เล่ม</p>
        </div>
        <div className="bg-white border border-rose-100 bg-rose-50/10 rounded-xl p-4 shadow-xs text-center">
          <p className="text-[10px] text-rose-500 font-bold">รออนุมัติยืม</p>
          <p className="text-lg font-black text-rose-600">{stats.pendingBorrows} รายการ</p>
        </div>
        <div className="bg-white border border-amber-100 bg-amber-50/10 rounded-xl p-4 shadow-xs text-center">
          <p className="text-[10px] text-amber-500 font-bold">กำลังถูกยืมไป</p>
          <p className="text-lg font-black text-amber-600">{stats.activeBorrows} เล่ม</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('teachers')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'teachers' 
              ? 'border-rose-600 text-rose-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🎓 รายชื่อคุณครูผู้จัดการ ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'students' 
              ? 'border-rose-600 text-rose-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          👥 รายชื่อนักเรียนแผนกต่าง ๆ ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('books')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'books' 
              ? 'border-rose-600 text-rose-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📖 ทะเบียนพิกัดหนังสือ ({books.length})
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'approvals' 
              ? 'border-rose-600 text-rose-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🔔 อนุมัติยืมและรับคืนหนังสือ ({stats.pendingBorrows})
        </button>
      </div>

      {/* Toast alert notifications */}
      {alert && (
        <div className={`p-4 rounded-xl shadow-md border text-sm flex gap-3 animate-fadeIn duration-300 ${
          alert.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {alert.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <p className="font-bold">{alert.message}</p>
        </div>
      )}

      {/* Main content grid splitter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side Content Area (9/12) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Sub-Tab 1: Teachers list */}
          {activeTab === 'teachers' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-50 gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">ระบบลงทะเบียนคุณครู</h3>
                  <p className="text-xs text-slate-500">สามารถเพิ่ม/ลบบัญชี และสิทธิ์ตรวจสอบคลังหนังสือแก่คุณครูใหม่ได้</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    id="btn-admin-teacher-import-toggle"
                    onClick={() => setShowTeacherImportForm(!showTeacherImportForm)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    ดึงชื่อจาก Google Sheets
                  </button>
                  <button
                    id="btn-add-teacher-toggle"
                    onClick={() => { setShowAddTeacher(!showAddTeacher); setShowAddStudent(false); }}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มบัญชีอาจารย์
                  </button>
                </div>
              </div>

              {/* Google Sheets Teacher Import form */}
              {showTeacherImportForm && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/50">
                    <h4 className="font-extrabold text-xs text-emerald-900 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      ดึงข้อมูลรายชื่อครูและอาจารย์จาก Google Sheets
                    </h4>
                    <button onClick={() => setShowTeacherImportForm(false)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="text-xs text-emerald-800 space-y-1">
                    <p><strong>คำแนะนำในการจัดเตรียมคอลัมน์ใน Google Sheets รายชื่อครู/อาจารย์:</strong></p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800/80">
                      <li>ควรจัดเตรียมคอลัมน์ชื่อ <strong>"ชื่อ-นามสกุล"</strong> และ <strong>"ตำแหน่ง"</strong> ใน Google Sheet</li>
                      <li>หากไม่มีคอลัมน์ <strong>"ชื่อผู้ใช้งาน"</strong> (Username) ระบบจะสร้างชื่อผู้ใช้งานสำหรับเข้าสู่ระบบให้อัตโนมัติจากชื่อ-นามสกุล</li>
                      <li>สามารถระบุคอลัมน์ <strong>"รหัสผ่าน"</strong> (Password) ได้ หากไม่มีรหัสผ่านเริ่มต้นจะเป็นชื่อผู้ใช้งาน</li>
                      <li>ตั้งค่าสิทธิ์แชร์ชีตให้เป็น <strong>"ทุกคนที่มีลิงก์มีสิทธิ์เข้าถึง (Anyone with the link can view)"</strong></li>
                    </ul>
                  </div>

                  <form onSubmit={handleTeacherGoogleSheetsImport} className="flex gap-2">
                    <input
                      type="url"
                      required
                      placeholder="วางลิงก์ Google Sheets รายชื่อครู/อาจารย์ตรงนี้..."
                      value={teacherSheetUrl}
                      onChange={(e) => setTeacherSheetUrl(e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="submit"
                      disabled={teacherImportLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {teacherImportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      ดึงรายชื่อ
                    </button>
                  </form>
                </div>
              )}

              {/* Add Teacher form */}
              {showAddTeacher && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5 animate-fadeIn">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-rose-500" /> กรอกข้อมูลคุณครูใหม่</h4>
                  <form onSubmit={handleAddTeacherSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Username (ใช้เข้าสู่ระบบ)</label>
                      <input
                        id="form-teacher-username"
                        type="text"
                        required
                        placeholder="เช่น teacher_somsak"
                        value={teacherUser}
                        onChange={(e) => setTeacherUser(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ชื่อจริง / นามสกุลจริง</label>
                      <input
                        id="form-teacher-name"
                        type="text"
                        required
                        placeholder="เช่น อ.สมศักดิ์ รักสอน"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ตำแหน่ง</label>
                      <input
                        id="form-teacher-position"
                        type="text"
                        placeholder="เช่น หัวหน้าแผนกวิชา, ครูผู้รับผิดชอบ"
                        value={teacherPosition}
                        onChange={(e) => setTeacherPosition(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">กำหนดรหัสผ่าน (Password)</label>
                      <input
                        id="form-teacher-pass"
                        type="password"
                        required
                        placeholder="รหัสผ่านเริ่มต้น"
                        value={teacherPass}
                        onChange={(e) => setTeacherPass(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="sm:col-span-4 flex justify-end gap-2 mt-1">
                      <button type="button" onClick={() => setShowAddTeacher(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 text-xs rounded-lg cursor-pointer">ยกเลิก</button>
                      <button type="submit" disabled={actionLoading === 'add_teacher'} className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer">
                        {actionLoading === 'add_teacher' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'ลงทะเบียนคุณครู'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Teachers table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                      <th className="p-3">Username</th>
                      <th className="p-3">ชื่อจริง-นามสกุล</th>
                      <th className="p-3">ตำแหน่ง</th>
                      <th className="p-3">สิทธิ์ใช้งาน</th>
                      <th className="p-3 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {teachers.map(t => (
                      <tr key={t.username} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-600">{t.username}</td>
                        <td className="p-3 font-bold text-slate-800">{t.name}</td>
                        <td className="p-3 text-slate-500 font-medium">{t.position || 'คุณครู'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[10px] font-bold">
                            คุณครูเช็คพัสดุ
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            id={`btn-delete-teacher-${t.username}`}
                            onClick={() => handleDeleteTeacher(t.username)}
                            disabled={actionLoading === t.username}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Students list */}
          {activeTab === 'students' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-50 gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">ระบบดูแลและขึ้นทะเบียนรายชื่อนักเรียน</h3>
                  <p className="text-xs text-slate-500">จัดการข้อมูลประวัตินักเรียน บัญชีสมาชิก และตรวจสอบสถานะการยืม/รับหนังสือรายบุคคล</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    id="btn-admin-student-import-toggle"
                    onClick={() => setShowStudentImportForm(!showStudentImportForm)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    ดึงชื่อจาก Google Sheets
                  </button>
                  <button
                    id="btn-add-student-toggle"
                    onClick={() => { setShowAddStudent(!showAddStudent); setShowAddTeacher(false); }}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มข้อมูลนักเรียน
                  </button>
                </div>
              </div>

              {/* Google Sheets Student Import form */}
              {showStudentImportForm && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/50">
                    <h4 className="font-extrabold text-xs text-emerald-900 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      ดึงข้อมูลรายชื่อนักเรียนนักศึกษาจาก Google Sheets
                    </h4>
                    <button onClick={() => setShowStudentImportForm(false)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="text-xs text-emerald-800 space-y-1">
                    <p><strong>คำแนะนำในการจัดเตรียมคอลัมน์ใน Google Sheets รายชื่อนักเรียน:</strong></p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800/80">
                      <li>ต้องมีคอลัมน์หลักอย่างน้อยสองตัวคือ <strong>"รหัสนักเรียน"</strong> (หรือ รหัสประจำตัว/รหัสนักศึกษา) และ <strong>"ชื่อ-นามสกุล"</strong></li>
                      <li>สามารถเพิ่มคอลัมน์ <strong>"ห้องเรียน"</strong> หรือ <strong>"สาขา"</strong> (Department) เพื่อเก็บข้อมูลระดับชั้นเรียนของนักเรียนได้</li>
                      <li>ตั้งค่าสิทธิ์แชร์ชีตให้เป็น <strong>"ทุกคนที่มีลิงก์มีสิทธิ์เข้าถึง (Anyone with the link can view)"</strong></li>
                    </ul>
                  </div>

                  <form onSubmit={handleStudentGoogleSheetsImport} className="flex gap-2">
                    <input
                      type="url"
                      required
                      placeholder="วางลิงก์ Google Sheets รายชื่อนักเรียนตรงนี้..."
                      value={studentSheetUrl}
                      onChange={(e) => setStudentSheetUrl(e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="submit"
                      disabled={studentImportLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {studentImportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      ดึงรายชื่อ
                    </button>
                  </form>
                </div>
              )}

              {/* Add Student form */}
              {showAddStudent && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5 animate-fadeIn">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-rose-500" /> กรอกข้อมูลประวัตินักเรียนใหม่</h4>
                  <form onSubmit={handleAddStudentSubmit} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">รหัสนักศึกษา (Student ID) *</label>
                      <input
                        id="form-student-id"
                        type="text"
                        required
                        placeholder="เช่น 64301, STD-901"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ชื่อจริง / นามสกุลจริง *</label>
                      <input
                        id="form-student-name"
                        type="text"
                        required
                        placeholder="เช่น นายอภิสิทธิ์ เล่าเรียน"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ระดับชั้น *</label>
                      <input
                        id="form-student-level"
                        type="text"
                        required
                        placeholder="เช่น ม.4, ปวช.1, ปวส.2"
                        value={studentLevel}
                        onChange={(e) => setStudentLevel(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ห้อง</label>
                      <input
                        id="form-student-room"
                        type="text"
                        placeholder="เช่น 1, 2, A, B (ว่างหากไม่มี)"
                        value={studentRoom}
                        onChange={(e) => setStudentRoom(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">แผนกวิชา / สาขา</label>
                      <input
                        id="form-student-major"
                        type="text"
                        placeholder="เช่น เทคโนโลยีสารสนเทศ"
                        value={studentMajor}
                        onChange={(e) => setStudentMajor(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="sm:col-span-5 flex justify-end gap-2 mt-1">
                      <button type="button" onClick={() => setShowAddStudent(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 text-xs rounded-lg cursor-pointer">ยกเลิก</button>
                      <button type="submit" disabled={actionLoading === 'add_student'} className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer">
                        {actionLoading === 'add_student' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'เพิ่มรายชื่อนักเรียน'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Student Search Box */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="🔍 ค้นหารายชื่อนักเรียน-นักศึกษา ด้วย รหัสประจำตัว, ชื่อ-นามสกุล, หรือห้องเรียน/สาขา..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
                {studentSearchQuery && (
                  <button
                    onClick={() => setStudentSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Students table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                      <th className="p-3">รหัสประจำตัว</th>
                      <th className="p-3">ชื่อ-นามสกุล</th>
                      <th className="p-3">ระดับชั้น</th>
                      <th className="p-3">ห้อง</th>
                      <th className="p-3">แผนกวิชา / สาขา</th>
                      <th className="p-3">สถานะการยืม / รายละเอียด</th>
                      <th className="p-3 text-center">สถานะใช้งานแอป</th>
                      <th className="p-3 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {students.filter(s => {
                      const q = studentSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        (s.id && s.id.toLowerCase().includes(q)) ||
                        (s.name && s.name.toLowerCase().includes(q)) ||
                        (s.department && s.department.toLowerCase().includes(q))
                      );
                    }).map(s => {
                      // Calculate borrow statistics
                      const studentBorrows = transactions.filter(t => t.userId === s.id && t.type === 'borrow' && t.status === 'approved');
                      const studentPendings = transactions.filter(t => t.userId === s.id && t.type === 'borrow' && t.status === 'pending');
                      const studentGiveOuts = transactions.filter(t => t.userId === s.id && t.type === 'give_out' && t.status === 'approved');
                      const totalActive = studentBorrows.reduce((sum, x) => sum + x.qty, 0);
                      const totalPending = studentPendings.reduce((sum, x) => sum + x.qty, 0);
                      const totalGiveOut = studentGiveOuts.reduce((sum, x) => sum + x.qty, 0);

                      // Parse department into level, room, major
                      const parsed = parseStudentDept(s.department);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-600">{s.id}</td>
                          <td className="p-3 font-bold text-slate-800">{s.name}</td>
                          <td className="p-3 text-slate-700 font-semibold">{parsed.level}</td>
                          <td className="p-3 text-slate-700">{parsed.room}</td>
                          <td className="p-3 text-slate-500">{parsed.major}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1.5">
                              {totalActive > 0 && (
                                <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded font-bold text-[10px] flex items-center gap-1">
                                  📖 ยืม {totalActive} เล่ม
                                </span>
                              )}
                              {totalPending > 0 && (
                                <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 rounded font-bold text-[10px] flex items-center gap-1">
                                  ⏳ รออนุมัติ {totalPending} เล่ม
                                </span>
                              )}
                              {totalGiveOut > 0 && (
                                <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded font-bold text-[10px] flex items-center gap-1">
                                  📦 รับแจกขาด {totalGiveOut} เล่ม
                                </span>
                              )}
                              {totalActive === 0 && totalPending === 0 && totalGiveOut === 0 && (
                                <span className="text-slate-400 text-[11px] italic">ไม่มีประวัติการยืม/รับหนังสือ</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {s.isRegistered ? (
                              <span className="px-3 py-1 bg-emerald-500 text-white rounded-full font-bold text-[10px] shadow-xs inline-flex items-center gap-1 justify-center min-w-[110px]">
                                🟢 ใช้งานอยู่ (Active)
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-rose-500 text-white rounded-full font-bold text-[10px] shadow-xs inline-flex items-center gap-1 justify-center min-w-[110px]">
                                🔴 ยังไม่เข้าระบบ
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              id={`btn-delete-student-${s.id}`}
                              onClick={() => handleDeleteStudent(s.id)}
                              disabled={actionLoading === s.id}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {students.filter(s => {
                      const q = studentSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        (s.id && s.id.toLowerCase().includes(q)) ||
                        (s.name && s.name.toLowerCase().includes(q)) ||
                        (s.department && s.department.toLowerCase().includes(q))
                      );
                    }).length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                          ไม่พบข้อมูลรหัสนักศึกษา หรือชื่อนักเรียนที่ค้นหาในระบบ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab 3: Books overview */}
          {activeTab === 'books' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-50 gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">ภาพรวมหนังสือสะสมทั้งหมดในฐานข้อมูล</h3>
                  <p className="text-xs text-slate-500">รายการและสถิติคลังย่อของแต่ละรายการ พร้อมช่องข้อมูลหนังสือหลักสูตรการสอน</p>
                </div>
                <button
                  id="btn-admin-import-toggle"
                  onClick={() => setShowImportForm(!showImportForm)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm self-start sm:self-center"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  ดึงจาก Google Sheets
                </button>
              </div>

              {/* Google Sheets Import form */}
              {showImportForm && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/50">
                    <h4 className="font-extrabold text-xs text-emerald-900 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      ดึงข้อมูลหนังสือหลักสูตรการสอนจาก Google Sheets
                    </h4>
                    <button onClick={() => setShowImportForm(false)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="text-xs text-emerald-800 space-y-1">
                    <p><strong>คำแนะนำในการจัดเตรียมคอลัมน์ใน Google Sheets:</strong></p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800/80">
                      <li>ต้องมีคอลัมน์หลักอย่างน้อยสองตัวคือ <strong>"รหัสหนังสือ"</strong> และ <strong>"ชื่อหนังสือ"</strong></li>
                      <li>สามารถเพิ่มคอลัมน์ <strong>"หลักสูตร"</strong> หรือ <strong>"หลักสูตรการสอน"</strong> (Curriculum) เพื่อจัดเก็บข้อมูลหลักสูตรที่หนังสือเล่มนั้นอ้างอิงได้แบบเรียลไทม์!</li>
                      <li>คอลัมน์สนับสนุนเพิ่มเติม: <strong>"ผู้แต่ง"</strong>, <strong>"หมวดหมู่"</strong>, <strong>"จำนวนนำเข้า"</strong>, <strong>"ชั้นวาง"</strong></li>
                      <li>ตั้งค่าสิทธิ์ให้แชร์เป็น <strong>"ทุกคนที่มีลิงก์มีสิทธิ์เข้าถึง (Anyone with the link can view)"</strong></li>
                    </ul>
                  </div>

                  <form onSubmit={handleGoogleSheetsImport} className="flex gap-2">
                    <input
                      type="url"
                      required
                      placeholder="วางลิงก์ Google Sheets ตรงนี้..."
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="submit"
                      disabled={importLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {importLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      ดึงข้อมูลชีต
                    </button>
                  </form>
                </div>
              )}

              {/* Search Box */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="🔍 ค้นหา รหัสหนังสือ, ชื่อหนังสือ, ผู้แต่ง, หรือหลักสูตรการสอน..."
                  value={bookSearchQuery}
                  onChange={(e) => setBookSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
                {bookSearchQuery && (
                  <button
                    onClick={() => setBookSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                      <th className="p-3">รหัสหนังสือ</th>
                      <th className="p-3">รูปภาพ</th>
                      <th className="p-3">ชื่อเรื่อง</th>
                      <th className="p-3">ผู้แต่ง</th>
                      <th className="p-3">หลักสูตรการสอน</th>
                      <th className="p-3">หมวดหมู่</th>
                      <th className="p-3 text-center">พิกัดจัดเก็บ</th>
                      <th className="p-3 text-center">คงเหลือปัจจุบัน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {books.filter(b => {
                      const q = bookSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        (b.id && b.id.toLowerCase().includes(q)) ||
                        (b.title && b.title.toLowerCase().includes(q)) ||
                        (b.author && b.author.toLowerCase().includes(q)) ||
                        (b.curriculum && b.curriculum.toLowerCase().includes(q)) ||
                        (b.category && b.category.toLowerCase().includes(q))
                      );
                    }).map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-indigo-600">{b.id}</td>
                        <td className="p-3">
                          {editingCoverBookId === b.id ? (
                            <div className="flex flex-col gap-1.5 min-w-[150px] bg-slate-50 p-2 rounded-xl border border-slate-200">
                              <span className="text-[10px] text-slate-500 font-bold">ใส่ URL รูปปกหนังสือ:</span>
                              <input
                                type="text"
                                placeholder="https://example.com/image.jpg"
                                value={tempCoverUrl}
                                onChange={(e) => setTempCoverUrl(e.target.value)}
                                className="px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none font-sans"
                                autoFocus
                              />
                              <div className="flex gap-1 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setEditingCoverBookId(null)}
                                  className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                                >
                                  ยกเลิก
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/books/${b.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ coverUrl: tempCoverUrl })
                                      });
                                      if (res.ok) {
                                        showAlert('success', 'อัปเดตลิงก์รูปภาพเรียบร้อยแล้ว');
                                        setEditingCoverBookId(null);
                                        loadAllData();
                                      } else {
                                        showAlert('error', 'อัปเดตล้มเหลว');
                                      }
                                    } catch (err) {
                                      showAlert('error', 'เกิดข้อผิดพลาดในการบันทึก');
                                    }
                                  }}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  บันทึก
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => {
                                setEditingCoverBookId(b.id);
                                setTempCoverUrl(b.coverUrl || '');
                              }}
                              className="w-10 h-14 bg-slate-50 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-lg flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer transition-all shadow-2xs"
                              title="คลิกเพื่อเพิ่มหรือแก้ไขลิงก์รูปภาพปกหนังสือ"
                            >
                              {b.coverUrl ? (
                                <>
                                  <img 
                                    src={b.coverUrl} 
                                    alt={b.title} 
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      // fallback if broken link
                                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=80&auto=format&fit=crop&q=60';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                                    <span className="text-[9px] text-white font-extrabold tracking-tight">แก้ไขรูป</span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-emerald-600 p-1 text-center">
                                  <Plus className="w-3.5 h-3.5 mb-0.5" />
                                  <span className="text-[8px] font-bold leading-tight">เพิ่มรูป</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-800 line-clamp-1">{b.title}</td>
                        <td className="p-3 text-slate-500">{b.author}</td>
                        <td className="p-3 text-slate-600">
                          {b.curriculum ? (
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded font-semibold text-[10px] block max-w-[200px] truncate" title={b.curriculum}>
                              🎓 {b.curriculum}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">- ไม่ระบุหลักสูตร -</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">{b.category}</td>
                        <td className="p-3 text-center">
                          {b.location ? (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold text-[10px]">📍 {b.location}</span>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">{b.stockQty} / {b.receivedQty} เล่ม</td>
                      </tr>
                    ))}
                    {books.filter(b => {
                      const q = bookSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        (b.id && b.id.toLowerCase().includes(q)) ||
                        (b.title && b.title.toLowerCase().includes(q)) ||
                        (b.author && b.author.toLowerCase().includes(q)) ||
                        (b.curriculum && b.curriculum.toLowerCase().includes(q)) ||
                        (b.category && b.category.toLowerCase().includes(q))
                      );
                    }).length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                          ไม่พบข้อมูลรหัสหนังสือ หรือชื่อหนังสือที่ค้นหาในระบบ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab 4: Approvals */}
          {activeTab === 'approvals' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Section: Pending Borrow Approval list */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                      <HeartHandshake className="w-5 h-5 text-rose-500" />
                      รายการขอยืมหนังสือจากนักเรียนที่ค้างพิจารณา
                    </h3>
                    <p className="text-xs text-slate-500">ตรวจสอบจำนวนคงเหลือในคลังก่อนตัดสินใจอนุมัติหรือไม่อนุมัติ</p>
                  </div>
                  <span className="text-xs bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg border">
                    รอตรวจสอบ {pendingRequests.length} เล่ม
                  </span>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                    <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2 bg-emerald-50 p-2 rounded-full" />
                    <p className="font-bold text-slate-600 text-sm">ไม่มีคำขอยืมหนังสือที่ค้างอนุมัติอยู่</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">เมื่อนักเรียนส่งคำขอยืมหนังสือ รายการคำขอจะแสดงที่นี่ทันที</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                          <th className="p-3">รหัสธุรกรรม</th>
                          <th className="p-3">ข้อมูลหนังสือ</th>
                          <th className="p-3">นักเรียนผู้ยืม</th>
                          <th className="p-3">ทำรายการเมื่อ</th>
                          <th className="p-3">หมายเหตุ</th>
                          <th className="p-3 text-right">การจัดการคำขอ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {pendingRequests.map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-50/30 transition-all">
                            <td className="p-3 font-mono font-bold text-slate-500">{tx.id}</td>
                            <td className="p-3">
                              <p className="font-extrabold text-slate-800 line-clamp-1">{tx.bookTitle}</p>
                              <p className="text-[10px] text-indigo-600">รหัสเล่ม: {tx.bookId}</p>
                            </td>
                            <td className="p-3">
                              <p className="font-extrabold text-slate-800">{tx.userName}</p>
                              <p className="text-[10px] text-slate-400">ID: {tx.userId}</p>
                            </td>
                            <td className="p-3 font-semibold text-slate-500">
                              {new Date(tx.timestamp).toLocaleString('th-TH')} น.
                            </td>
                            <td className="p-3 text-slate-400 italic font-normal">"{tx.notes || 'ไม่มีระบุ'}"</td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  id={`btn-admin-approve-tx-${tx.id}`}
                                  onClick={() => handleApproveBorrow(tx.id)}
                                  disabled={actionLoading === tx.id}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  อนุมัติ
                                </button>
                                <button
                                  id={`btn-admin-reject-tx-${tx.id}`}
                                  onClick={() => handleRejectBorrow(tx.id)}
                                  disabled={actionLoading === tx.id}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  ไม่อนุมัติ
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section: Currently Borrowed books list (Return Tracking portal) */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                      <Undo2 className="w-5 h-5 text-indigo-500" />
                      ทะเบียนค้างยืมและดำเนินการรับคืนหนังสือ
                    </h3>
                    <p className="text-xs text-slate-500">รายการหนังสือที่ได้รับการอนุมัติและยังไม่มีการส่งคืนกลับเข้าชั้นวาง</p>
                  </div>
                  <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg">
                    กำลังยืมอยู่ {activeBorrows.length} เล่ม
                  </span>
                </div>

                {activeBorrows.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                    <BookOpen className="w-10 h-10 text-indigo-300 mx-auto mb-2 bg-indigo-50 p-2 rounded-full" />
                    <p className="font-bold text-slate-600 text-sm">ไม่มีหนังสือค้างส่งคืนในขณะนี้</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">หนังสือทั้งหมดทุกเล่มอยู่ในคลังพร้อมสำหรับการยืม</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                          <th className="p-3">รหัสธุรกรรม</th>
                          <th className="p-3">ชื่อหนังสือ / บาร์โค้ด</th>
                          <th className="p-3">นักเรียนผู้ยืม</th>
                          <th className="p-3">วันอนุมัติยืมออก</th>
                          <th className="p-3">ผู้อนุมัติ</th>
                          <th className="p-3 text-right">ดำเนินการรับคืนหนังสือ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {activeBorrows.map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-50/30 transition-all">
                            <td className="p-3 font-mono font-bold text-slate-500">{tx.id}</td>
                            <td className="p-3">
                              <p className="font-extrabold text-slate-800 line-clamp-1">{tx.bookTitle}</p>
                              <p className="text-[10px] text-indigo-600 font-bold">บาร์โค้ด: {tx.bookId}</p>
                            </td>
                            <td className="p-3">
                              <p className="font-extrabold text-slate-800">{tx.userName}</p>
                              <p className="text-[10px] text-slate-400">รหัสตัว: {tx.userId}</p>
                            </td>
                            <td className="p-3 font-semibold text-slate-500">
                              {new Date(tx.timestamp).toLocaleString('th-TH')} น.
                            </td>
                            <td className="p-3 text-slate-500 italic font-semibold">{tx.approvedBy}</td>
                            <td className="p-3 text-right">
                              <button
                                id={`btn-admin-return-tx-${tx.id}`}
                                onClick={() => handleReturnBook(tx.id)}
                                disabled={actionLoading === tx.id}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-xs ml-auto"
                              >
                                รับคืนเข้าคลังหนังสือ
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Side Settings Area (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Danger Zone Reset Module */}
          <div className="bg-white rounded-2xl border border-red-150 p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-red-800 text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              การจัดการความปลอดภัยและข้อมูล
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ฟังก์ชันนี้ทำไว้เพื่อให้สามารถย้อนสถานะข้อมูลทดสอบกลับไปจุดเริ่มต้นได้ สะดวกต่อการนำเสนอหรือเมื่อข้อมูลในระบบชนกันเสียหาย
            </p>

            {!showResetConfirm ? (
              <button
                id="btn-show-reset-db"
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Database className="w-4 h-4" />
                รีเซ็ตฐานข้อมูลเป็นค่าตั้งต้น (Reset)
              </button>
            ) : (
              <form onSubmit={handleResetDBSubmit} className="space-y-3 p-4 bg-red-50/50 border border-red-100 rounded-xl fade-in text-xs">
                <div>
                  <p className="font-bold text-red-900">ระบุรหัสความปลอดภัยผู้ใช้เพื่อยืนยัน:</p>
                  <p className="text-[10px] text-red-600 mt-0.5">ระบุรหัสประจำตัวพินความปลอดภัยแอดมิน: <strong className="bg-white px-1.5 py-0.5 border rounded font-mono font-black text-rose-800">44120</strong></p>
                </div>

                <input
                  id="admin-reset-code-input"
                  type="text"
                  required
                  placeholder="พิมพ์ 44120"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl font-bold font-mono text-center text-sm"
                />

                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => { setShowResetConfirm(false); setResetCode(''); }}
                    className="flex-1 py-1.5 bg-white text-slate-600 border rounded-lg font-semibold"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit" 
                    disabled={actionLoading === 'reset'}
                    className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {actionLoading === 'reset' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    ยืนยันการคืนค่า
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Guidelines / Helper Box */}
          <div className="bg-slate-55 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 space-y-3">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4.5 h-4.5 text-slate-500" />
              หน้าที่ผู้ดูแลระบบหลัก (Admin)
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[11px] leading-relaxed">
              <li>สร้างและลงทะเบียนบัญชีสำหรับคุณครู เพื่อให้ครูไปนำเข้าหนังสือจาก Google Sheet ต่อไป</li>
              <li>ติดตามการเคลื่อนไหวรวมจาก Bento Grid ด้านซ้าย</li>
              <li>สามารถตรวจสอบหรือลบประวัตินักเรียนที่มีพฤติกรรมผิดนโยบายการคืนหนังสือได้</li>
              <li>การล้างข้อมูลโรงงานจะไม่ลบบัญชีแอดมินตัวนี้</li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
