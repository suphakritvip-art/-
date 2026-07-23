import React, { useState, useEffect } from 'react';
import { Book, BookTransaction } from '../types';
import { 
  User, BookOpen, Clock, CheckCircle2, AlertTriangle, FileText, 
  RefreshCw, LogOut, Loader2, Search, ArrowRight, BookMarked, HelpCircle, 
  BookMarkedIcon, Star, Filter, HeartHandshake, Check, AlertCircle, XCircle,
  Send
} from 'lucide-react';

interface StudentDashboardProps {
  student: { id: string; name: string; department: string };
  onLogout: () => void;
  forceOpenProfile?: boolean;
  onCloseProfile?: () => void;
  onProfileUpdate?: (updatedUser: any) => void;
}

const parseStudentDept = (deptStr: string) => {
  const clean = (deptStr || '').trim();
  if (!clean || clean === 'ทั่วไป') {
    return { level: clean || 'ทั่วไป', room: '-', major: 'ทั่วไป' };
  }

  let level = '';
  let room = '-';
  let major = clean;

  // 1. Try to find Level (ระดับชั้น) such as ปวช.1, ปวช.2, ปวช.3, ปวส.1, ปวส.2, ม.1, ม.2, ม.3, ม.4, ม.5, ม.6, ปวช, ปวส
  const levelRegex = /(ปวช\s*\.\s*[1-3]|ปวส\s*\.\s*[1-2]|ม\s*\.\s*[1-6]|ปวช|ปวส)/i;
  const levelMatch = clean.match(levelRegex);
  if (levelMatch) {
    level = levelMatch[1].replace(/\s+/g, ''); // e.g. "ปวส.1"
    major = major.replace(levelMatch[0], '').trim();
  }

  // 2. Try to find Room (ห้อง) like 1/1, 1/2, 1/3, 1/4, etc.
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

  // If level was matched but no room was found yet, check if there's an orphaned slash in the remaining text or the original text
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

  // 3. Check parenthesized class codes like (IT-3A), (CPE-1), (CS-2B)
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

  // 4. Clean up the major text
  major = major
    .replace(/\s*ห้อง\s*/g, ' ')
    .replace(/^\s*[\/\-,\(\)]+\s*|\s*[\/\-,\(\)]+\s*$/g, '')
    .trim();

  // 5. Fallback formatting if level is still empty
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

  // Normalise level formatting if it matched ปวช or ปวส without dots/numbers
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

export default function StudentDashboard({ 
  student, 
  onLogout, 
  forceOpenProfile, 
  onCloseProfile,
  onProfileUpdate
}: StudentDashboardProps) {
  const parsedDept = parseStudentDept(student.department);
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<BookTransaction[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Active Tab View: 'catalog' | 'profile' | 'contact'
  const [activeTab, setActiveTab] = useState<'catalog' | 'profile' | 'contact'>('catalog');

  // Student Profile detail states
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  
  // Custom states for Name & parsed department components
  const [studentName, setStudentName] = useState(student.name);
  const [studentLevel, setStudentLevel] = useState(parsedDept.level || '');
  const [studentRoom, setStudentRoom] = useState(parsedDept.room || '');
  const [studentMajor, setStudentMajor] = useState(parsedDept.major || '');

  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [religion, setReligion] = useState('');
  const [age, setAge] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');

  // Contact teacher/staff states
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [contactSubject, setContactSubject] = useState('ติดต่อสอบถามข้อมูลการยืม/คืนหนังสือ');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');
  const [contactError, setContactError] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [sentMessages, setSentMessages] = useState<any[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');

  // Status feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const fetchBooks = async () => {
    setLoadingBooks(true);
    try {
      const res = await fetch('/api/books');
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch (err) {
      console.error('Error fetching books:', err);
    } finally {
      setLoadingBooks(false);
    }
  };

  const fetchMyTransactions = async () => {
    setLoadingTx(true);
    try {
      const res = await fetch(`/api/transactions?userId=${student.id}`);
      if (res.ok) {
        const data = await res.json();
        // Sort newest first
        setTransactions(data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingTx(false);
    }
  };

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/students/${student.id}/profile`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.student) {
          const s = data.student;
          setWeight(s.weight || '');
          setHeight(s.height || '');
          setBloodGroup(s.bloodGroup || '');
          setBirthdate(s.birthdate || '');
          setReligion(s.religion || '');
          setAge(s.age || '');
          setNickname(s.nickname || '');
          setEmail(s.email || '');
          
          if (s.name) setStudentName(s.name);
          if (s.department) {
            const parsed = parseStudentDept(s.department);
            setStudentLevel(parsed.level || '');
            setStudentRoom(parsed.room || '');
            setStudentMajor(parsed.major || '');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching student profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const res = await fetch('/api/teachers');
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
        if (data.length > 0) {
          setSelectedTeacher(data[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setProfileLoading(true);

    const combinedDept = `${studentLevel} ห้อง ${studentRoom} (${studentMajor})`.trim();

    try {
      const res = await fetch(`/api/students/${student.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentName,
          department: combinedDept,
          weight,
          height,
          bloodGroup,
          birthdate,
          religion,
          age,
          nickname,
          email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        setProfileLoading(false);
        return;
      }

      setProfileSuccess(data.message || 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว');
      
      // Update parent component state
      if (onProfileUpdate) {
        onProfileUpdate({
          ...student,
          name: studentName,
          department: combinedDept
        });
      }

      setProfileLoading(false);
    } catch (err) {
      setProfileError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
      setProfileLoading(false);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSuccess('');
    setContactError('');
    setContactLoading(true);

    if (!contactMessage.trim()) {
      setContactError('กรุณากรอกข้อความที่ต้องการติดต่อ');
      setContactLoading(false);
      return;
    }

    setTimeout(() => {
      const newMessage = {
        id: Math.random().toString(36).substring(2, 11).toUpperCase(),
        teacherName: selectedTeacher,
        subject: contactSubject,
        message: contactMessage,
        timestamp: new Date().toISOString(),
        status: 'ส่งแล้ว'
      };

      setSentMessages(prev => [newMessage, ...prev]);
      setContactSuccess(`ส่งข้อความถึง ${selectedTeacher} เรียบร้อยแล้ว!`);
      setContactMessage('');
      setContactLoading(false);
    }, 1000);
  };

  useEffect(() => {
    fetchBooks();
    fetchMyTransactions();
    fetchProfile();
    fetchTeachers();
  }, [student.id]);

  const triggerFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Student borrowing action
  const handleBorrowRequest = async (book: Book) => {
    if (book.stockQty <= 0) {
      triggerFeedback('error', 'ขออภัย! หนังสือเล่มนี้หมดคลังชั่วคราว ไม่สามารถยืมได้');
      return;
    }

    // Check if there is already an active pending request for the same book
    const hasPending = transactions.some(tx => tx.bookId === book.id && tx.status === 'pending');
    if (hasPending) {
      triggerFeedback('error', `คุณได้ส่งคำขอยืมเรื่อง "${book.title}" ไว้แล้ว กรุณารอคุณครูอนุมัติ`);
      return;
    }

    setActionLoading(book.id);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          userId: student.id,
          userName: student.name,
          userRole: 'student',
          qty: 1,
          type: 'borrow',
          notes: `นักเรียนแผนก ${student.department} ยื่นคำขอยืมด้วยตนเอง`
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerFeedback('success', `ส่งคำขอยืมเรื่อง "${book.title}" สำเร็จ! กรุณารอคุณครูอนุมัติ`);
        fetchMyTransactions();
        fetchBooks();
      } else {
        triggerFeedback('error', data.message || 'ส่งคำขอยืมล้มเหลว');
      }
    } catch (err) {
      triggerFeedback('error', 'เชื่อมต่อกับเซิร์ฟเวอร์ล้มเหลว');
    } finally {
      setActionLoading(null);
    }
  };

  // Get unique categories for filter
  const categories = ['ทั้งหมด', ...Array.from(new Set(books.map(b => b.category)))];

  // Filter & Search Books
  const filteredBooks = books.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ทั้งหมด' || b.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status: BookTransaction['status']) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1">🕒 รอครูอนุมัติ</span>;
      case 'approved':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1">📖 กำลังยืม</span>;
      case 'returned':
        return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1">✓ คืนแล้ว</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1">✗ ปฏิเสธ</span>;
      default:
        return null;
    }
  };

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('th-TH', { 
      day: 'numeric', month: 'short', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }) + ' น.';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Student Profile Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 text-white rounded-2xl p-6 shadow-xl shadow-emerald-950/10 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden border border-emerald-500/20">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/5 blur-xl"></div>
        <div className="absolute bottom-0 left-1/3 w-24 h-24 rounded-full bg-teal-500/10 blur-lg"></div>
        
        <div className="flex items-center gap-4 z-10">
          <div className="p-3.5 bg-white/15 backdrop-blur-md rounded-2xl shadow-inner border border-white/10">
            <User className="w-8 h-8 text-emerald-50" />
          </div>
          <div>
            <span className="bg-emerald-500/30 text-emerald-100 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/20">
              สถานะ: นักเรียน / ผู้รับหนังสือ
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-wide mt-1">{student.name}</h2>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-emerald-100/60 text-xs mt-1">
              <span>สถานะบัญชีการใช้งานในระบบได้รับการคุ้มครองและตรวจสอบสถิติแล้ว</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center z-10">
          <button
            onClick={() => { fetchBooks(); fetchMyTransactions(); }}
            className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl transition-all cursor-pointer border border-white/5"
            title="รีเฟรชข้อมูลคลังหนังสือ"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/30 text-rose-200 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* Floating Feedback Notification */}
      {feedback && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-2xl border flex items-start gap-3 max-w-md animate-fadeIn duration-300 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-bold text-sm">{feedback.type === 'success' ? 'ดำเนินการสำเร็จ' : 'เกิดข้อผิดพลาด'}</p>
            <p className="text-xs mt-0.5">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Student Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'catalog'
              ? 'border-emerald-600 text-emerald-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          คลังและยืมหนังสือ (Books Catalog)
        </button>
        <button
          onClick={() => {
            setActiveTab('contact');
            fetchTeachers();
          }}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'contact'
              ? 'border-emerald-600 text-emerald-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          ติดต่อคุณครู / เจ้าหน้าที่ (Contact)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Columns (3/4): Books Catalog, Profile, or Contact */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'catalog' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            
            {/* Search & Filter Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  รายการหนังสือทั้งหมดในคลังห้องสมุด
                </h3>
                <p className="text-xs text-slate-500">สามารถค้นหาชื่อหนังสือ ผู้แต่ง หรือรหัสหนังสือเพื่อยื่นเรื่องขอยืมได้</p>
              </div>

              {/* Dynamic stock total indicator */}
              <div className="bg-emerald-50 text-emerald-800 font-bold px-3 py-1.5 rounded-xl text-xs w-fit">
                📚 หนังสือพร้อมใช้ {books.reduce((acc, b) => acc + b.stockQty, 0)} / {books.reduce((acc, b) => acc + b.receivedQty, 0)} เล่ม
              </div>
            </div>

            {/* Inputs Group */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <input
                  id="search-books"
                  type="text"
                  placeholder="ค้นหาชื่อหนังสือ, ผู้เขียน, หรือรหัสรหัสประจำหนังสือ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select
                  id="category-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer font-medium"
                >
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category quick tabs pills */}
            <div className="flex flex-wrap gap-1.5 mb-6 pb-2 border-b border-slate-100 overflow-x-auto">
              {categories.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Books Grid */}
            {loadingBooks && books.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-emerald-500 mb-3" />
                <p className="font-medium text-sm">กำลังโหลดคลังหนังสืออัจฉริยะ...</p>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="py-20 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                <BookMarked className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-600 text-base">ไม่พบข้อมูลหนังสือที่ค้นหา</p>
                <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือใช้หมวดหมู่อื่นเพื่อความแม่นยำ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredBooks.map((book) => {
                  const isOutOfStock = book.stockQty <= 0;
                  const isPending = transactions.some(tx => tx.bookId === book.id && tx.status === 'pending');
                  const isBorrowed = transactions.some(tx => tx.bookId === book.id && tx.status === 'approved');

                  return (
                    <div 
                      key={book.id} 
                      className="border border-slate-100 hover:border-emerald-300 rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col group"
                    >
                      {/* Cover Photo Area with Unsplash fallback */}
                      <div className="h-44 bg-slate-100 relative overflow-hidden shrink-0">
                        <img 
                          src={book.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'} 
                          alt={book.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                          referrerPolicy="no-referrer"
                        />
                        {/* Shelf Location overlay badge */}
                        {book.location && (
                          <span className="absolute top-3 left-3 bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                            📍 {book.location}
                          </span>
                        )}
                        {/* Category badge */}
                        <span className="absolute bottom-3 left-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                          {book.category}
                        </span>
                      </div>

                      {/* Content Details */}
                      <div className="p-4.5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            รหัส: {book.id}
                          </span>
                          <h4 className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug line-clamp-2 h-11 group-hover:text-emerald-700 transition-colors">
                            {book.title}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-1 font-medium">ผู้แต่ง: {book.author}</p>
                        </div>

                        {/* Inventory stock quantity indicators */}
                        <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-1 text-center shrink-0">
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">นำเข้าทั้งหมด</p>
                            <p className="text-sm font-bold text-slate-700">{book.receivedQty} เล่ม</p>
                          </div>
                          <div className="border-l border-slate-200">
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">ว่างให้ยืม</p>
                            <p className={`text-sm font-black ${isOutOfStock ? 'text-rose-500' : 'text-emerald-600'}`}>
                              {isOutOfStock ? 'หมดชั่วคราว' : `${book.stockQty} เล่ม`}
                            </p>
                          </div>
                        </div>

                        {/* Borrow CTA Button */}
                        <div className="pt-2 shrink-0">
                          {isPending ? (
                            <button
                              disabled
                              className="w-full py-2.5 bg-amber-50 border border-amber-200 text-amber-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                            >
                              🕒 รอคุณครูตรวจสอบคำขอ
                            </button>
                          ) : isBorrowed ? (
                            <div className="space-y-2">
                              <span className="w-full py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                                📖 คุณกำลังยืมหนังสือเล่มนี้อยู่
                              </span>
                              <button
                                onClick={() => handleBorrowRequest(book)}
                                disabled={isOutOfStock || actionLoading === book.id}
                                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                {actionLoading === book.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                ยืมเพิ่มอีกเล่ม
                              </button>
                            </div>
                          ) : (
                            <button
                              id={`btn-borrow-${book.id}`}
                              onClick={() => handleBorrowRequest(book)}
                              disabled={isOutOfStock || actionLoading === book.id}
                              className={`w-full py-2.5 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
                                isOutOfStock
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10'
                              }`}
                            >
                              {actionLoading === book.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <HeartHandshake className="w-4 h-4" />
                              )}
                              {isOutOfStock ? 'หนังสือคลังว่างไม่พอ' : 'ขอยืมหนังสือเล่มนี้'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}



        {activeTab === 'contact' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-emerald-600" />
                ติดต่อคุณครู / เจ้าหน้าที่ดูแลระบบห้องสมุด
              </h3>
              <p className="text-xs text-slate-500">พิมพ์ข้อความรายละเอียดเพื่อติดต่อสื่อสารไปยังรายชื่ออาจารย์หรือคุณครูฝ่ายบรรณารักษ์</p>
            </div>

            {contactError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{contactError}</span>
              </div>
            )}

            {contactSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{contactSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Message Composer Form */}
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">เลือกคุณครู/อาจารย์บรรณารักษ์ *</label>
                  {loadingTeachers ? (
                    <div className="py-2 text-slate-400 text-xs flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>กำลังโหลดรายชื่อผู้ดูแลระบบ...</span>
                    </div>
                  ) : teachers.length === 0 ? (
                    <div className="py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                      ⚠️ ไม่พบรายชื่อคุณครูในระบบ แต่อย่างไรก็ตามท่านสามารถยื่นเรื่องไปที่เจ้าหน้าที่ทั่วไปได้
                    </div>
                  ) : (
                    <select
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer font-bold"
                    >
                      {teachers.map((t, idx) => (
                        <option key={idx} value={t.name}>{t.name} ({t.position || 'คุณครู'})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">หัวเรื่องการติดต่อ *</label>
                  <select
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer font-medium"
                  >
                    <option value="ติดต่อสอบถามข้อมูลการยืม/คืนหนังสือ">ติดต่อสอบถามข้อมูลการยืม/คืนหนังสือ</option>
                    <option value="แจ้งเรื่องพบปัญหาการใช้งานเว็บไซต์/ระบบ">แจ้งเรื่องพบปัญหาการใช้งานเว็บไซต์/ระบบ</option>
                    <option value="ขอเสนอแนะรายชื่อหนังสือที่อยากให้ซื้อเพิ่มเติม">ขอเสนอแนะรายชื่อหนังสือที่อยากให้ซื้อเพิ่มเติม</option>
                    <option value="อื่นๆ (ระบุข้อความด้านล่าง)">อื่นๆ (ระบุข้อความด้านล่าง)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">รายละเอียดข้อความที่ต้องการส่ง *</label>
                  <textarea
                    rows={4}
                    placeholder="พิมพ์รายละเอียดข้อความติดต่อที่นี่เพื่อรับการช่วยเหลืออย่างดีที่สุด..."
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={contactLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {contactLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  ส่งข้อความติดต่อครูผู้ดูแล
                </button>
              </form>

              {/* History column */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-700 text-sm flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  ประวัติการติดต่อคุณครู ({sentMessages.length})
                </h4>

                {sentMessages.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-semibold">ยังไม่มีประวัติการส่งข้อมูล</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">ข้อความที่ส่งจะจำลองการรับส่งข้อความเข้ากล่องนี้ทันที</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {sentMessages.map((msg) => (
                      <div key={msg.id} className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs space-y-2">
                        <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                          <span className="font-bold text-slate-800">ผู้รับ: {msg.teacherName}</span>
                          <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-700 font-bold rounded-full text-[9px]">
                            {msg.status}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700">หัวเรื่อง: {msg.subject}</p>
                          <p className="text-slate-600 mt-1 bg-white p-2 rounded border border-slate-100 italic">
                            "{msg.message}"
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          ส่งเมื่อ: {new Date(msg.timestamp).toLocaleString('th-TH')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column (1/4): Student Borrow logs & stats */}
        <div className="space-y-6">
          
          {/* Stats widget panel */}
          <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-2xl shadow-xl shadow-emerald-950/15 p-5 relative overflow-hidden border border-emerald-500/10">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 rounded-full bg-emerald-500/10 blur-lg"></div>
            <h3 className="font-bold text-sm text-emerald-200 tracking-wider uppercase mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              สรุปข้อมูลการยืมสะสม
            </h3>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-emerald-800/50 pb-2">
                <span className="text-xs text-emerald-300/80">กำลังยืมอยู่ (ยังไม่คืน)</span>
                <span className="text-lg font-black text-white">
                  {transactions.filter(tx => tx.status === 'approved' && tx.type === 'borrow').length} เล่ม
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-emerald-800/50 pb-2">
                <span className="text-xs text-emerald-300/80">รอคุณครูอนุมัติยืม</span>
                <span className="text-lg font-black text-amber-300">
                  {transactions.filter(tx => tx.status === 'pending' && tx.type === 'borrow').length} เล่ม
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-300/80">ประวัติการยืมที่คืนแล้ว</span>
                <span className="text-lg font-black text-emerald-400">
                  {transactions.filter(tx => tx.status === 'returned' && tx.type === 'borrow').length} เล่ม
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Borrowing logs */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              ประวัติความเคลื่อนไหวล่าสุด
            </h3>

            {loadingTx && transactions.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-10 text-center text-slate-400 border border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-semibold">ยังไม่มีประวัติการยืมในระบบ</p>
                <p className="text-[10px] text-slate-400 mt-0.5">เลือกหนังสือเล่มด้านซ้ายเพื่อขอยืม</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1">
                {transactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl hover:bg-slate-50 hover:shadow-sm transition-all text-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2 border-b border-slate-150/50 pb-1.5">
                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                          รหัส: {tx.id}
                        </span>
                        <span>{getStatusBadge(tx.status)}</span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-extrabold text-slate-800 text-xs leading-snug line-clamp-2">
                          {tx.bookTitle}
                        </h4>
                        <div className="text-[10px] text-slate-500 space-y-0.5">
                          <p>ทำรายการเมื่อ: {formatDateTime(tx.timestamp)}</p>
                          {tx.approvedBy && (
                            <p className="text-emerald-600 font-semibold">ผู้อนุมัติ: {tx.approvedBy}</p>
                          )}
                          {tx.returnDate && (
                            <p className="text-emerald-600 font-semibold">วันที่ส่งคืน: {formatDateTime(tx.returnDate)}</p>
                          )}
                          {tx.notes && (
                            <p className="text-slate-400 italic bg-white/50 px-1.5 py-0.5 rounded border border-slate-100 mt-1">
                              "{tx.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guide Helper Box */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-xs text-emerald-800 space-y-2">
            <h4 className="font-bold flex items-center gap-1.5 text-emerald-900">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              คำแนะนำขั้นตอนการยืม
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-emerald-800/90 leading-relaxed">
              <li>คลิกปุ่ม <strong>"ขอยืมหนังสือเล่มนี้"</strong> ที่เรื่องที่ต้องการ</li>
              <li>ระบบจะส่งคำขอยืมไปยังหน้าจอของคุณครูโดยทันที</li>
              <li>เมื่อคุณครูตรวจสอบความพร้อมของเล่ม จะกด <strong>"อนุมัติ"</strong> เพื่อให้คุณรับไป</li>
              <li>เมื่อใช้งานเสร็จ นำหนังสือมาส่งคืนคุณครูเพื่อสแกนและบันทึกคืนคลัง</li>
            </ol>
          </div>

        </div>

      </div>

      {/* Student Profile Modal Overlay */}
      {forceOpenProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    ระเบียนและแก้ไขรายละเอียดข้อมูลส่วนตัวนักเรียน
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">กรอกข้อมูลส่วนตัวเพิ่มเติมเพื่อบันทึกลงระเบียนฐานข้อมูลห้องสมุด</p>
                </div>
              </div>
              <button 
                onClick={onCloseProfile}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {profileError && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs flex items-start gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <form onSubmit={handleProfileSave} className="space-y-6">
                {/* Section 1: Academic & Account Info */}
                <div className="space-y-3.5 pb-4 border-b border-slate-100">
                  <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm border-l-4 border-emerald-500 pl-2.5">
                    ข้อมูลประวัติการเรียนและบัญชีผู้ใช้ (Academic & Account Profile)
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Student ID */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">รหัสประจำตัวนักเรียน (Student ID)</label>
                      <input
                        type="text"
                        disabled
                        value={student.id}
                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none font-bold font-mono"
                      />
                    </div>

                    {/* Student Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">ชื่อจริง - นามสกุล (Full Name)</label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น สมชาย ใจดี"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                      />
                    </div>

                    {/* Level */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">ระดับชั้น (Level)</label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น ปวช.1, ปวส.2, ม.4"
                        value={studentLevel}
                        onChange={(e) => setStudentLevel(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                      />
                    </div>

                    {/* Room */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">ห้อง (Room)</label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น 1/2, 2, ทั่วไป"
                        value={studentRoom}
                        onChange={(e) => setStudentRoom(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                      />
                    </div>

                    {/* Department / Major */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">แผนกวิชา / สาขางาน (Department / Major)</label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น เทคโนโลยีธุรกิจดิจิทัล, ช่างยนต์, เทคโนโลยีสารสนเทศ"
                        value={studentMajor}
                        onChange={(e) => setStudentMajor(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Personal Profile Info */}
                <div className="space-y-3.5">
                  <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm border-l-4 border-emerald-500 pl-2.5">
                    ประวัติส่วนตัวและข้อมูลติดต่อเพิ่มเติม (Personal & Contact Information)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nickname */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">ชื่อเล่น (Nickname)</label>
                      <input
                        type="text"
                        placeholder="เช่น บอย"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>

                    {/* Age */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">อายุ (Age)</label>
                      <input
                        type="number"
                        placeholder="เช่น 15"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>

                    {/* Weight */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">น้ำหนัก (Weight - กิโลกรัม)</label>
                      <input
                        type="text"
                        placeholder="เช่น 55"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>

                    {/* Height */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">ส่วนสูง (Height - เซนติเมตร)</label>
                      <input
                        type="text"
                        placeholder="เช่น 170"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>

                    {/* Blood Group */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">กรุ๊ปเลือด (Blood Group)</label>
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer font-medium"
                      >
                        <option value="">-- เลือกกรุ๊ปเลือด --</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="AB">AB</option>
                        <option value="O">O</option>
                      </select>
                    </div>

                    {/* Birthdate */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">วันเดือนปีเกิด (Birthdate)</label>
                      <input
                        type="date"
                        value={birthdate}
                        onChange={(e) => setBirthdate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                      />
                    </div>

                    {/* Religion */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">ศาสนา (Religion)</label>
                      <input
                        type="text"
                        placeholder="เช่น พุทธ, คริสต์, อิสลาม"
                        value={religion}
                        onChange={(e) => setReligion(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">อีเมลติดต่อ (Email Address)</label>
                      <input
                        type="email"
                        placeholder="เช่น student@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onCloseProfile}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    ปิด (Close)
                  </button>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    บันทึกข้อมูลส่วนตัว (Save)
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
