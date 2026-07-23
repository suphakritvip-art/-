import React, { useState, useEffect } from 'react';
import { 
  X, UserCheck, Key, Save, Lock, Calendar, Mail, 
  CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck, Briefcase, GraduationCap, Hash
} from 'lucide-react';
import { Teacher } from '../types';

interface TeacherDetailModalProps {
  teacher: Teacher | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess: () => void;
}

export const TeacherDetailModal: React.FC<TeacherDetailModalProps> = ({
  teacher,
  isOpen,
  onClose,
  onUpdateSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

  // Edit Teacher Profile States
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [subject, setSubject] = useState('');
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [birthdate, setBirthdate] = useState('');

  // Password Edit States
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback States
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (teacher) {
      setName(teacher.name || '');
      setPosition(teacher.position || '');
      setDepartment(teacher.department || '');
      setSubject(teacher.subject || '');
      setNickname(teacher.nickname || '');
      setAge(teacher.age || '');
      setBirthdate(teacher.birthdate || '');
      setNewPassword('');
      setMessage(null);
    }
  }, [teacher, isOpen]);

  if (!isOpen || !teacher) return null;

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingInfo(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/teachers/${teacher.username}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          position,
          department,
          subject,
          nickname,
          age,
          birthdate
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'อัปเดตข้อมูลส่วนตัวครูเรียบร้อยแล้ว' });
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
      const res = await fetch(`/api/teachers/${teacher.username}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPassword.trim() })
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `เปลี่ยนรหัสผ่านให้คุณครู (${teacher.name}) สำเร็จแล้ว!` });
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white font-black text-2xl shadow-inner shrink-0">
              {teacher.name ? teacher.name.charAt(0) : 'T'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-mono font-bold tracking-wide text-rose-100 border border-white/20">
                  Username: {teacher.username}
                </span>
                <span className="px-2.5 py-0.5 bg-amber-400/90 text-amber-950 font-bold rounded-full text-[10px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> คุณครูประจำการ
                </span>
              </div>
              <h2 className="text-xl font-black mt-1 text-white">{teacher.name}</h2>
              <p className="text-xs text-rose-100 flex items-center gap-1 mt-0.5 opacity-90">
                <Briefcase className="w-3.5 h-3.5" /> {teacher.position || 'ตำแหน่งคุณครู'} {teacher.department ? `(${teacher.department})` : ''}
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
                  : 'border-transparent text-rose-100/70 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" /> ข้อมูลครู
            </button>
            <button
              onClick={() => { setActiveTab('password'); setMessage(null); }}
              className={`pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'password'
                  ? 'border-white text-white font-black'
                  : 'border-transparent text-rose-100/70 hover:text-white'
              }`}
            >
              <Key className="w-4 h-4" /> แก้ไขรหัสผ่านครู
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

          {/* TAB 1: Teacher Info */}
          {activeTab === 'info' && (
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-rose-600" /> แก้ไขข้อมูลประวัติคุณครู
                </h3>
                <span className="text-[11px] font-mono text-slate-400">Username: {teacher.username}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อจริง-นามสกุลครู *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ตำแหน่งทางวิชาการ / หน้าที่</label>
                  <input
                    type="text"
                    placeholder="เช่น ครูผู้สอน, หัวหน้าสาขา"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">แผนกวิชา / สังกัด</label>
                  <input
                    type="text"
                    placeholder="เช่น เทคโนโลยีสารสนเทศ"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">กลุ่มสาระ / รายวิชาที่รับผิดชอบ</label>
                  <input
                    type="text"
                    placeholder="เช่น คอมพิวเตอร์, ภาษาไทย"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อเล่นครู</label>
                  <input
                    type="text"
                    placeholder="เช่น ครูอ๊อฟ"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">วัน/เดือน/ปีเกิด ( Birthdate )</label>
                  <input
                    type="text"
                    placeholder="เช่น 10/9/2530"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">อายุ (ปี)</label>
                  <input
                    type="text"
                    placeholder="เช่น 35"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all"
                  />
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loadingInfo ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนตัวครู'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Edit Password */}
          {activeTab === 'password' && (
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm">
                  <Lock className="w-4 h-4 text-rose-600" />
                  จัดการและแก้ไขรหัสผ่านเข้าใช้งานของคุณครู
                </div>
                <p className="text-slate-600 leading-relaxed">
                  แอดมินผู้ดูแลระบบสามารถกำหนดหรือเปลี่ยนรหัสผ่านใหม่ให้ครูได้โดยตรง ในกรณีที่ลืมรหัสผ่านหรือต้องการรีเซ็ตรหัสผ่านตั้งต้น
                </p>
                <div className="pt-1 flex items-center gap-2 font-mono text-slate-700 text-xs bg-white/80 p-2.5 rounded-xl border border-rose-200/50">
                  <span className="font-sans text-slate-500 font-bold">รหัสผ่านปัจจุบันของคุณครูในระบบ:</span>
                  <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                    {teacher.password ? teacher.password : (teacher.birthdate || '123')}
                  </span>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                <label className="block text-xs font-extrabold text-slate-800">
                  ระบุรหัสผ่านใหม่ให้ครู (New Password) *
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="พิมพ์รหัสผ่านใหม่ที่นี่..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all"
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
                    {teacher.birthdate && (
                      <button
                        type="button"
                        onClick={() => setNewPassword(teacher.birthdate || '')}
                        className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3 text-rose-500" />
                        ใช้วันเกิด ({teacher.birthdate})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNewPassword(teacher.username)}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                    >
                      <Hash className="w-3 h-3 text-indigo-500" />
                      ใช้ Username ({teacher.username})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPassword('123')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                    >
                      123
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Key className="w-4 h-4" />
                  {loadingPass ? 'กำลังบันทึก...' : 'บันทึกเปลี่ยนรหัสผ่านใหม่'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
