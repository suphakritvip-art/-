import React, { useState, useMemo } from 'react';
import { Book, Student } from '../types';
import { 
  Gift, 
  Search, 
  Users, 
  Check, 
  ChevronRight, 
  AlertCircle, 
  BookOpen, 
  Clock, 
  Loader2, 
  HelpCircle,
  FolderMinus,
  Sparkles,
  Layers,
  ChevronDown,
  UserCheck
} from 'lucide-react';

interface TextbookDistributionProps {
  books: Book[];
  students: Student[];
  currentUser: { name: string; id: string; role: string };
  onRefreshData: () => void;
}

// Helper to parse student departments
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
    /ห้อง\s*([0-9]+\/[0-9]+)/,
    /ห้อง\s*([0-9]+)/,
    /([0-9]+\/[0-9]+)/,
    /\/([0-9]+)/
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

  return { level, room, major };
};

export default function TextbookDistribution({ books, students, currentUser, onRefreshData }: TextbookDistributionProps) {
  const [distMode, setDistMode] = useState<'individual' | 'batch'>('batch'); // default is batch as reopenings are batch heavy
  
  // States for Individual Distribution
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [individualNotes, setIndividualNotes] = useState<string>('แจกหนังสือตำราเรียนประจำภาคการศึกษา (เด็กเข้าใหม่)');
  
  // States for Batch Class Distribution
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [batchBookIds, setBatchBookIds] = useState<string[]>([]);
  const [batchNotes, setBatchNotes] = useState<string>('แจกหนังสือเรียนยกห้องประจำช่วงเปิดเทอมภาคเรียนใหม่');
  
  // General feedback states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Parse and extract levels/rooms from students roster
  const { uniqueLevels, uniqueRooms } = useMemo(() => {
    const lvlSet = new Set<string>();
    const rmSet = new Set<string>();

    students.forEach(s => {
      const parsed = parseStudentDept(s.department);
      if (parsed.level) lvlSet.add(parsed.level);
      if (parsed.room && parsed.room !== '-') rmSet.add(parsed.room);
    });

    return {
      uniqueLevels: Array.from(lvlSet).sort(),
      uniqueRooms: Array.from(rmSet).sort()
    };
  }, [students]);

  // Matching students for batch distribution
  const matchedBatchStudents = useMemo(() => {
    if (!selectedLevel) return [];
    
    return students.filter(s => {
      const parsed = parseStudentDept(s.department);
      if (parsed.level !== selectedLevel) return false;
      if (selectedRoom && parsed.room !== selectedRoom) return false;
      return true;
    });
  }, [students, selectedLevel, selectedRoom]);

  // Autocomplete / suggestions for individual student selection
  const studentSuggestions = useMemo(() => {
    const query = studentSearchQuery.trim().toLowerCase();
    if (query.length < 2) return [];

    return students.filter(s => 
      s.id.toLowerCase().includes(query) || 
      s.name.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [students, studentSearchQuery]);

  // Find currently selected student details
  const selectedStudentObj = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  // Toggle selection for individual books
  const toggleIndividualBook = (bookId: string) => {
    setSelectedBookIds(prev => 
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
  };

  // Toggle selection for batch books
  const toggleBatchBook = (bookId: string) => {
    setBatchBookIds(prev => 
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
  };

  // Handle Individual submission
  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setAlert({ type: 'error', message: 'กรุณาเลือกนักศึกษาผู้รับหนังสือเรียน' });
      return;
    }
    if (selectedBookIds.length === 0) {
      setAlert({ type: 'error', message: 'กรุณาเลือกหนังสือเรียนที่ต้องการแจกอย่างน้อย 1 เล่ม' });
      return;
    }

    setSubmitting(true);
    setAlert(null);

    try {
      const response = await fetch('/api/transactions/batch-give-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: [selectedStudentId],
          bookIds: selectedBookIds,
          qty: 1,
          notes: individualNotes,
          approvedBy: currentUser.name || 'เจ้าหน้าที่ห้องสมุด'
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'เกิดข้อผิดพลาดในการทำธุรกรรมแจกหนังสือ');
      }

      setAlert({ type: 'success', message: `สำเร็จ! แจกจ่ายวิชาเรียนแก่นักเรียนเรียบร้อยแล้ว` });
      setSelectedBookIds([]);
      setSelectedStudentId('');
      setStudentSearchQuery('');
      onRefreshData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Batch submission
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (matchedBatchStudents.length === 0) {
      setAlert({ type: 'error', message: 'ไม่พบนักเรียนในระดับชั้น / ห้องที่ระบุ' });
      return;
    }
    if (batchBookIds.length === 0) {
      setAlert({ type: 'error', message: 'กรุณาเลือกหนังสือวิชาเรียนที่ต้องการแจกอย่างน้อย 1 รายการ' });
      return;
    }

    const studentIds = matchedBatchStudents.map(s => s.id);
    setSubmitting(true);
    setAlert(null);

    try {
      const response = await fetch('/api/transactions/batch-give-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds,
          bookIds: batchBookIds,
          qty: 1,
          notes: batchNotes,
          approvedBy: currentUser.name || 'เจ้าหน้าที่ห้องสมุด'
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'แจกหนังสือไม่สำเร็จเนื่องจากสต็อกคลังขาดแคลน');
      }

      setAlert({ 
        type: 'success', 
        message: `สำเร็จ! บันทึกแจกหนังสือเรียนให้แก่ระดับชั้นนี้แล้ว ${data.count} รายการ (จำนวนนักเรียน ${studentIds.length} คน)` 
      });
      setBatchBookIds([]);
      onRefreshData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-6">
      
      {/* Tab Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <Gift className="w-5.5 h-5.5 text-teal-600 shrink-0" />
            ระบบบริการแจกหนังสือเรียน (Textbook Distribution Module)
          </h3>
          <p className="text-xs text-slate-400">ผู้ดูแลระบบหรือครูผู้ดูแลสามารถใช้คลังกลางตัดจ่ายหนังสือขาดสิทธิ์ แจกแบบรายบุคคล (เด็กเข้าใหม่) หรือแจกเป็นกลุ่มห้องเรียนยกห้องได้สะดวกรวดเร็ว</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => { setDistMode('batch'); setAlert(null); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${distMode === 'batch' ? 'bg-white text-teal-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
          >
            👥 แจกกลุ่ม/ห้องเรียนยกชุด
          </button>
          <button
            type="button"
            onClick={() => { setDistMode('individual'); setAlert(null); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${distMode === 'individual' ? 'bg-white text-teal-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
          >
            👤 แจกเด็กใหม่/รายบุคคล
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {alert && (
        <div className={`p-4 rounded-xl shadow-xs border text-xs sm:text-sm flex gap-3 animate-fadeIn ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${alert.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`} />
          <div>
            <p className="font-bold">{alert.type === 'success' ? 'บันทึกแจกสำเร็จ' : 'เกิดข้อผิดพลาดในการแจก'}</p>
            <p className="font-medium text-slate-500 mt-0.5">{alert.message}</p>
          </div>
        </div>
      )}

      {/* MODE 1: BATCH CLASS DISTRIBUTION */}
      {distMode === 'batch' && (
        <form onSubmit={handleBatchSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Step 1: Filter Group / Class */}
            <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
              <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 font-black text-xs flex items-center justify-center">1</span>
                <h4 className="font-extrabold text-xs text-slate-700">ระบุกลุ่มชั้นเรียนเพื่อแจกยกห้อง</h4>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">ระดับชั้นเรียน (เช่น ปวช.1, ปวส.2)</label>
                  <select
                    required
                    value={selectedLevel}
                    onChange={(e) => { setSelectedLevel(e.target.value); setSelectedRoom(''); }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- เลือกระดับชั้น --</option>
                    {uniqueLevels.map(lvl => (
                      <option key={lvl} value={lvl}>{lvl === 'ทั่วไป' ? 'บุคคลทั่วไป / ไม่ระบุชั้นปี' : `ระดับชั้น ${lvl}`}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">ห้องเรียน (ระบุเฉพาะเจาะจง หรือละไว้เพื่อแจกทั้งระดับชั้น)</label>
                  <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500"
                  >
                    <option value="">แจกทั้งหมด (ไม่กรองเฉพาะห้อง)</option>
                    {uniqueRooms.map(rm => (
                      <option key={rm} value={rm}>ห้อง {rm}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1.5 shadow-2xs">
                  <p className="font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-500" />
                    จำนวนนักศึกษาที่จัดเตรียมแจก:
                  </p>
                  {selectedLevel ? (
                    <p className="text-[11px] font-bold text-teal-600">
                      พบรายชื่อทั้งหมด {matchedBatchStudents.length} คน (ระดับชั้น {selectedLevel} {selectedRoom ? `ห้อง ${selectedRoom}` : ''})
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">กรุณาเลือกระดับชั้นเรียนก่อนเพื่อตรวจสอบจำนวนรายชื่อ</p>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Select books for this class */}
            <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
              <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 font-black text-xs flex items-center justify-center">2</span>
                <h4 className="font-extrabold text-xs text-slate-700">เลือกวิชาหนังสือที่ต้องการแจก (กี่รายวิชาก็ได้)</h4>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {books.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">ไม่มีหนังสือในคลังในขณะนี้</p>
                ) : (
                  books.map(book => {
                    const isSelected = batchBookIds.includes(book.id);
                    const isOutOfStock = book.stockQty <= 0;
                    
                    return (
                      <div 
                        key={book.id}
                        onClick={() => !isOutOfStock && toggleBatchBook(book.id)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${isOutOfStock ? 'bg-slate-150 border-slate-200 opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? 'bg-teal-50 border-teal-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 truncate">{book.title}</p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{book.category} | สต็อกคงเหลือ: {book.stockQty} เล่ม</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {isOutOfStock ? (
                            <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">หมด</span>
                          ) : isSelected ? (
                            <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5 stroke-[3]" /></span>
                          ) : (
                            <span className="w-5 h-5 rounded-full border border-slate-300 bg-white" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Step 3: notes and submit */}
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">หมายเหตุการแจกจ่ายเพิ่มเติม</label>
              <input
                type="text"
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
                placeholder="ระบุ เช่น บันทึกแจกเด็กเปิดเรียนภาคเรียน 1/2569"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || matchedBatchStudents.length === 0 || batchBookIds.length === 0}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังแจกหนังสือและตัดสต็อกแบบกลุ่ม โปรดรอสักครู่...
                </>
              ) : (
                <>
                  <Gift className="w-4.5 h-4.5" />
                  ยืนยันบันทึกการแจกหนังสือแก่ผู้เรียน {matchedBatchStudents.length} คน x {batchBookIds.length} วิชา (รวม {matchedBatchStudents.length * batchBookIds.length} รายการแจก)
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* MODE 2: INDIVIDUAL DISTRIBUTION */}
      {distMode === 'individual' && (
        <form onSubmit={handleIndividualSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Step 1: Select Student */}
            <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl relative">
              <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 font-black text-xs flex items-center justify-center">1</span>
                <h4 className="font-extrabold text-xs text-slate-700">ระบุผู้รับ / รหัสนักเรียน</h4>
              </div>

              <div className="space-y-3.5 relative">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">พิมพ์ชื่อ หรือ รหัสนักเรียนเพื่อค้นหา</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => {
                        setStudentSearchQuery(e.target.value);
                        if (e.target.value === '') setSelectedStudentId('');
                      }}
                      placeholder="เช่น สมชาย หรือ รหัส 66xxx"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {/* Autocomplete Suggestions menu */}
                  {studentSuggestions.length > 0 && !selectedStudentId && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20 max-h-48 overflow-y-auto">
                      {studentSuggestions.map(s => {
                        const parsed = parseStudentDept(s.department);
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedStudentId(s.id);
                              setStudentSearchQuery(`${s.name} (${s.id})`);
                            }}
                            className="px-3.5 py-2 hover:bg-teal-50 cursor-pointer text-xs font-bold text-slate-700 flex flex-col gap-0.5 border-b border-slate-50 last:border-0"
                          >
                            <span>{s.name} <span className="text-slate-400">({s.id})</span></span>
                            <span className="text-[10px] text-slate-400 font-medium">ห้อง: {parsed.level} ({parsed.room})</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected student badge details */}
                {selectedStudentObj ? (
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs space-y-1 animate-fadeIn">
                    <p className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      เลือกผู้รับสำเร็จ:
                    </p>
                    <p className="font-bold text-slate-800">{selectedStudentObj.name}</p>
                    <p className="text-[10px] text-slate-500">รหัส: {selectedStudentObj.id} | ระดับชั้น: {parseStudentDept(selectedStudentObj.department).level} (ห้อง {parseStudentDept(selectedStudentObj.department).room})</p>
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-dashed border-slate-200 rounded-xl text-center py-6 text-[10px] text-slate-400">
                    พิมพ์ข้อมูลด้านบนเพื่อเริ่มตรวจสอบข้อมูลผู้รับสิทธิ์รายบุคคล
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Select books */}
            <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
              <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2">
                <span className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 font-black text-xs flex items-center justify-center">2</span>
                <h4 className="font-extrabold text-xs text-slate-700">เลือกตู้เก็บวิชาเรียนที่ต้องการแจกสิทธิ์</h4>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {books.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">ไม่มีหนังสือในตู้ในขณะนี้</p>
                ) : (
                  books.map(book => {
                    const isSelected = selectedBookIds.includes(book.id);
                    const isOutOfStock = book.stockQty <= 0;

                    return (
                      <div 
                        key={book.id}
                        onClick={() => !isOutOfStock && toggleIndividualBook(book.id)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${isOutOfStock ? 'bg-slate-150 border-slate-200 opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? 'bg-teal-50 border-teal-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 truncate">{book.title}</p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{book.category} | คงเหลือพร้อมส่ง: {book.stockQty} เล่ม</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {isOutOfStock ? (
                            <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">หมด</span>
                          ) : isSelected ? (
                            <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5 stroke-[3]" /></span>
                          ) : (
                            <span className="w-5 h-5 rounded-full border border-slate-300 bg-white" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Step 3: notes and Submit */}
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">บันทึกช่วยจำ / หมายเหตุ</label>
              <input
                type="text"
                value={individualNotes}
                onChange={(e) => setIndividualNotes(e.target.value)}
                placeholder="เช่น แจกตำราประจำวิชาเทคโนโลยีใหม่เข้าเรียนรายบุคคล"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedStudentId || selectedBookIds.length === 0}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังดำเนินรายการแจกเดี่ยว...
                </>
              ) : (
                <>
                  <Gift className="w-4.5 h-4.5" />
                  บันทึกยืนยันแจกหนังสือวิชาเรียนที่เลือกให้แก่นักเรียนรายบุคคล
                </>
              )}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
