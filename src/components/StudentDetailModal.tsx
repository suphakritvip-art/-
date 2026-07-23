import React, { useState, useEffect } from 'react';
import { 
  X, User, Key, Save, Lock, Calendar, Mail, 
  CheckCircle2, AlertCircle, BookOpen, Eye, EyeOff, Sparkles, Hash, GraduationCap
} from 'lucide-react';
import { Student, BookTransaction, Book } from '../types';

interface StudentDetailModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess: () => void;
  transactions?: BookTransaction[];
  books?: Book[];
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  isOpen,
  onClose,
  onUpdateSuccess,
  transactions = [],
  books = []
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'history'>('info');

  // Edit Profile States
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [religion, setReligion] = useState('');

  // Password Edit States
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback States
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (student) {
      setName(student.name || '');
      setDepartment(student.department || '');
      setNickname(student.nickname || '');
      setBirthdate(student.birthdate || '');
      setAge(student.age || '');
      setEmail(student.email || '');
      setWeight(student.weight || '');
      setHeight(student.height || '');
      setBloodGroup(student.bloodGroup || '');
      setReligion(student.religion || '');
      setNewPassword('');
      setMessage(null);
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingInfo(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/students/${student.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          department,
          nickname,
          birthdate,
          age,
          email,
          weight,
          height,
          bloodGroup,
          religion
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'อัปเดตข้อมูลส่วนตัวนักเรียนเรียบร้อยแล้ว' });
        onUpdateSuccess();
      } else {
        setMessage({ type: 'error', text: data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว' });
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setMessage({ type: 'error', text: 'กรุณากรอกรหัสผ่านใหม่ที่ต้องการตั้ง' });
      return;
    }

    setLoadingPass(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/students/${student.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPassword.trim() })
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `เปลี่ยนรหัสผ่านให้นักเรียน (${student.name}) สำเร็จแล้ว!` });
        setNewPassword('');
        onUpdateSuccess();
      } else {
        setMessage({ type: 'error', text: data.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว' });
    } finally {
      setLoadingPass(false);
    }
  };

  // Filter student transactions
  const studentTx = transactions.filter(t => t.userId === student.id);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-indigo-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white font-black text-2xl shadow-inner shrink-0">
              {student.name ? student.name.charAt(0) : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-mono font-bold tracking-wide text-sky-100 border border-white/20">
                  รหัสนักศึกษา: {student.id}
                </span>
                {student.isRegistered || student.isLoggedIn ? (
                  <span className="px-2.5 py-0.5 bg-emerald-400/90 text-emerald-950 font-bold rounded-full text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> ลงทะเบียนใช้งานแล้ว
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-amber-400/90 text-amber-950 font-bold rounded-full text-[10px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> ยังไม่ลงชื่อเข้าใช้
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black mt-1 text-white">{student.name}</h2>
              <p className="text-xs text-sky-100 flex items-center gap-1 mt-0.5 opacity-90">
                <GraduationCap className="w-3.5 h-3.5" /> {student.department || 'ไม่ระบุสาขา/ห้องเรียน'}
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-white/20 mt-6 gap-2">
            <button
              onClick={() => { setActiveTab('info'); setMessage(null); }}
              className={`pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'info'
                  ? 'border-white text-white font-black'
                  : 'border-transparent text-sky-100/70 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" /> ข้อมูลส่วนตัว
            </button>
            <button
              onClick={() => { setActiveTab('password'); setMessage(null); }}
              className={`pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'password'
                  ? 'border-white text-white font-black'
                  : 'border-transparent text-sky-100/70 hover:text-white'
              }`}
            >
              <Key className="w-4 h-4" /> แก้ไขรหัสผ่าน
            </button>
            <button
              onClick={() => { setActiveTab('history'); setMessage(null); }}
              className={`pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'history'
                  ? 'border-white text-white font-black'
                  : 'border-transparent text-sky-100/70 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" /> ประวัติการยืม-คืน ({studentTx.length})
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">

          {/* Status Alert Banner */}
          {message && (
            <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-fadeIn ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* TAB 1: Personal Info */}
          {activeTab === 'info' && (
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <User className="w-4 h-4 text-sky-600" /> แก้ไขข้อมูลส่วนตัวนักเรียน
                </h3>
                <span className="text-[11px] text-slate-400">รหัสประจำตัว: {student.id}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อ-นามสกุลจริง *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ระดับชั้น / ห้องเรียน / แผนกวิชา *</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อเล่น</label>
                  <input
                    type="text"
                    placeholder="เช่น กอล์ฟ, เมย์"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">วัน/เดือน/ปีเกิด ( Birthdate )</label>
                  <input
                    type="text"
                    placeholder="เช่น 12/10/2548"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">อายุ (ปี)</label>
                  <input
                    type="text"
                    placeholder="เช่น 17"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">อีเมลติดต่อ</label>
                  <input
                    type="email"
                    placeholder="student@school.ac.th"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">น้ำหนัก (กก.) / ส่วนสูง (ซม.)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="กก. (เช่น 55)"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="ซม. (เช่น 170)"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">หมู่เลือด / ศาสนา</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="กรุ๊ปเลือด (เช่น O, A, B)"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="ศาสนา (เช่น พุทธ)"
                      value={religion}
                      onChange={(e) => setReligion(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loadingInfo}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loadingInfo ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนตัว'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Edit Password */}
          {activeTab === 'password' && (
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                  <Lock className="w-4 h-4 text-amber-600" />
                  จัดการและแก้ไขรหัสผ่านเข้าใช้งานของนักเรียน
                </div>
                <p className="text-slate-600 leading-relaxed">
                  คุณครูและผู้ดูแลระบบสามารถกำหนดหรือเปลี่ยนรหัสผ่านใหม่ให้นักเรียนได้โดยตรง ในกรณีที่นักเรียนลืมรหัสผ่านหรือต้องการรีเซ็ตรหัสผ่านตั้งต้น
                </p>
                <div className="pt-1 flex items-center gap-2 font-mono text-slate-700 text-xs bg-white/80 p-2.5 rounded-xl border border-amber-200/50">
                  <span className="font-sans text-slate-500 font-bold">รหัสผ่านปัจจุบันในระบบ:</span>
                  <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                    {student.password ? student.password : '(ยังไม่มีการตั้งรหัสผ่าน)'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                <label className="block text-xs font-extrabold text-slate-800">
                  ระบุรหัสผ่านใหม่ให้นักเรียน (New Password) *
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="พิมพ์รหัสผ่านใหม่ที่นี่..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Quick preset buttons */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 mb-1.5">⚡ ปุ่มลัดตั้งรหัสผ่านสำเร็จรูป:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {student.birthdate && (
                      <button
                        type="button"
                        onClick={() => setNewPassword(student.birthdate || '')}
                        className="px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3 text-sky-500" />
                        ใช้วันเกิด ({student.birthdate})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNewPassword(student.id)}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                    >
                      <Hash className="w-3 h-3 text-indigo-500" />
                      ใช้รหัสนักเรียน ({student.id})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPassword('123456')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                    >
                      123456
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loadingPass || !newPassword.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Key className="w-4 h-4" />
                  {loadingPass ? 'กำลังบันทึก...' : 'บันทึกเปลี่ยนรหัสผ่านใหม่'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Borrowing & Transaction History */}
          {activeTab === 'history' && (
            <div className="space-y-3 text-xs">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                ประวัติการยืม-คืนหนังสือเรียนของนักเรียน ({student.name})
              </h3>

              {studentTx.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  ไม่พบประวัติการยืม หรือการขอรับหนังสือยืมเรียนของนักเรียนรายนี้
                </div>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {studentTx.map((tx) => {
                    const book = books.find(b => b.id === tx.bookId);
                    return (
                      <div key={tx.id} className="p-3.5 hover:bg-slate-50/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <span>{book ? book.title : tx.bookTitle || 'หนังสือเรียน'}</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-mono">
                              {tx.qty} เล่ม
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                            <span>วันที่ทำรายการ: {new Date(tx.date || tx.createdAt || '').toLocaleDateString('th-TH')}</span>
                            {tx.type === 'give_out' ? (
                              <span className="text-indigo-600 font-bold">📦 แจกฟรีแบบเรียน</span>
                            ) : (
                              <span className="text-sky-600 font-bold">📖 ยืมคืนหนังสือ</span>
                            )}
                          </div>
                        </div>

                        <div>
                          {tx.status === 'approved' && (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-extrabold text-[10px] inline-flex items-center gap-1">
                              🟢 กำลังยืมอยู่
                            </span>
                          )}
                          {tx.status === 'pending' && (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-extrabold text-[10px] inline-flex items-center gap-1">
                              ⏳ รออนุมัติ
                            </span>
                          )}
                          {tx.status === 'returned' && (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-bold text-[10px] inline-flex items-center gap-1">
                              ✅ คืนหนังสือแล้ว
                            </span>
                          )}
                          {tx.status === 'rejected' && (
                            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold text-[10px] inline-flex items-center gap-1">
                              🔴 ปฏิเสธคำขอ
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
