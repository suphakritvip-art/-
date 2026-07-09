import React, { useState, useEffect } from 'react';
import { Book, BookTransaction } from '../types';
import { 
  User, BookOpen, Clock, CheckCircle2, AlertTriangle, FileText, 
  RefreshCw, LogOut, Loader2, Search, ArrowRight, BookMarked, HelpCircle, 
  BookMarkedIcon, Star, Filter, HeartHandshake, Check, AlertCircle, XCircle
} from 'lucide-react';

interface StudentDashboardProps {
  student: { id: string; name: string; department: string };
  onLogout: () => void;
}

export default function StudentDashboard({ student, onLogout }: StudentDashboardProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<BookTransaction[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  useEffect(() => {
    fetchBooks();
    fetchMyTransactions();
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
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white rounded-2xl p-6 shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/5 blur-xl"></div>
        
        <div className="flex items-center gap-4 z-10">
          <div className="p-3.5 bg-white/15 backdrop-blur-md rounded-2xl shadow-inner border border-white/10">
            <User className="w-8 h-8 text-emerald-50" />
          </div>
          <div>
            <span className="bg-emerald-500/30 text-emerald-100 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/20">
              สถานะ: นักเรียน / ผู้รับหนังสือ
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-wide mt-1">{student.name}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-emerald-100/80 text-xs sm:text-sm mt-1">
              <span>รหัสประจำตัว: <strong>{student.id}</strong></span>
              <span className="hidden sm:inline opacity-50">|</span>
              <span>ระดับชั้น/ฝ่าย: <strong>{student.department}</strong></span>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Columns (3/4): Books Catalog list */}
        <div className="lg:col-span-3 space-y-6">
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
                          <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
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
        </div>

        {/* Right Column (1/4): Student Borrow logs & stats */}
        <div className="space-y-6">
          
          {/* Stats widget panel */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl shadow-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 rounded-full bg-indigo-500/10 blur-lg"></div>
            <h3 className="font-bold text-sm text-indigo-200 tracking-wider uppercase mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              สรุปข้อมูลการยืมสะสม
            </h3>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-indigo-800 pb-2">
                <span className="text-xs text-indigo-300">กำลังยืมอยู่ (ยังไม่คืน)</span>
                <span className="text-lg font-black text-white">
                  {transactions.filter(tx => tx.status === 'approved' && tx.type === 'borrow').length} เล่ม
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-indigo-800 pb-2">
                <span className="text-xs text-indigo-300">รอคุณครูอนุมัติยืม</span>
                <span className="text-lg font-black text-amber-300">
                  {transactions.filter(tx => tx.status === 'pending' && tx.type === 'borrow').length} เล่ม
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-indigo-300">ประวัติการยืมที่คืนแล้ว</span>
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
                            <p className="text-indigo-600 font-semibold">ผู้อนุมัติ: {tx.approvedBy}</p>
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
    </div>
  );
}
