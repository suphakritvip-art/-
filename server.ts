import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Student, Teacher, Book, BookTransaction, SystemStats } from './src/types';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'database.json');

app.use(express.json());

// --- Helper for Database ---
interface DatabaseSchema {
  students: Student[];
  teachers: Teacher[];
  books: Book[];
  transactions: BookTransaction[];
}

function getInitialDB(): DatabaseSchema {
  return {
    students: [
      { id: '65010111', name: 'นายณภัทร สมบูรณ์', department: 'เทคโนโลยีสารสนเทศ (IT-3A)', isRegistered: true, password: '123' },
      { id: '65010112', name: 'นางสาวพิชญา แก้วดี', department: 'เทคโนโลยีสารสนเทศ (IT-3A)', isRegistered: true, password: '123' },
      { id: '65010113', name: 'นายธนพล สุขสันต์', department: 'เทคโนโลยีสารสนเทศ (IT-3A)', isRegistered: false },
      { id: '65010114', name: 'นางสาววิภาดา รักเรียน', department: 'วิทยาการคอมพิวเตอร์ (CS-2B)', isRegistered: false },
      { id: '65010115', name: 'นายกิตติคุณ เมืองไทย', department: 'วิทยาการคอมพิวเตอร์ (CS-2B)', isRegistered: false },
      { id: '65010116', name: 'นางสาวชลดา สวยงาม', department: 'วิศวกรรมคอมพิวเตอร์ (CPE-1)', isRegistered: false }
    ],
    teachers: [
      { username: 'teacher1', name: 'ครูสมชาย สายชล', isRegistered: true, password: '123' },
      { username: 'teacher2', name: 'ครูนงลักษณ์ ใจดี', isRegistered: true, password: '123' }
    ],
    books: [
      {
        id: 'B001',
        title: 'หลักการเขียนโปรแกรมคอมพิวเตอร์ด้วยภาษา Python',
        author: 'ดร.สมชาย สายชล',
        category: 'เทคโนโลยีและคอมพิวเตอร์',
        receivedQty: 50,
        givenOutQty: 12,
        stockQty: 38,
        location: 'ชั้นหนังสือ A1',
        curriculum: 'หลักสูตรประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.) สาขาวิชาเทคโนโลยีสารสนเทศ',
        coverUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
      },
      {
        id: 'B002',
        title: 'ฟิสิกส์ทั่วไป 1 สำหรับวิศวกร',
        author: 'ศ.ดร.พงษ์ศักดิ์ ชินนาถกูล',
        category: 'วิทยาศาสตร์และคณิตศาสตร์',
        receivedQty: 30,
        givenOutQty: 5,
        stockQty: 25,
        location: 'ชั้นหนังสือ B3',
        curriculum: 'หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมคอมพิวเตอร์',
        coverUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
      },
      {
        id: 'B003',
        title: 'การออกแบบเว็บไซต์และอินเตอร์เฟสผู้ใช้ (UI/UX Design)',
        author: 'อ.รพีพรรณ สุวรรณฉัตร',
        category: 'เทคโนโลยีและคอมพิวเตอร์',
        receivedQty: 20,
        givenOutQty: 0,
        stockQty: 20,
        location: 'ชั้นหนังสือ A2',
        curriculum: 'หลักสูตรประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.) สาขาวิชาเทคโนโลยีสารสนเทศ',
        coverUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
      },
      {
        id: 'B004',
        title: 'ภาษาอังกฤษเพื่อการสื่อสารทางธุรกิจ',
        author: 'Mr. John Smith',
        category: 'ภาษาศาสตร์',
        receivedQty: 40,
        givenOutQty: 10,
        stockQty: 30,
        location: 'ชั้นหนังสือ C1',
        curriculum: 'หลักสูตรประกาศนียบัตรวิชาชีพ (ปวช.) สาขาวิชาการจัดการธุรกิจค้าปลีก',
        coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
      }
    ],
    transactions: [
      {
        id: 'tx_1',
        bookId: 'B001',
        bookTitle: 'หลักการเขียนโปรแกรมคอมพิวเตอร์ด้วยภาษา Python',
        userId: '65010111',
        userName: 'นายณภัทร สมบูรณ์',
        userRole: 'student',
        qty: 1,
        type: 'borrow',
        status: 'approved',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
        approvedBy: 'ครูสมชาย สายชล'
      },
      {
        id: 'tx_2',
        bookId: 'B002',
        bookTitle: 'ฟิสิกส์ทั่วไป 1 สำหรับวิศวกร',
        userId: '65010112',
        userName: 'นางสาวพิชญา แก้วดี',
        userRole: 'student',
        qty: 1,
        type: 'borrow',
        status: 'pending',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
      }
    ]
  };
}

function readDB(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading database file:', error);
  }
  
  // Write initial database if not exists
  const initial = getInitialDB();
  writeDB(initial);
  return initial;
}

function writeDB(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing database file:', error);
  }
}

// Ensure DB is initialized
readDB();

// --- API Endpoints ---

// 1. Auth Endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const db = readDB();

  // Admin Role Check
  if (role === 'admin') {
    if (username === 'admin' && password === '44120') {
      return res.json({
        success: true,
        user: { id: 'admin', username: 'admin', name: 'ผู้ดูแลระบบสูงสุด (Super Admin)' },
        role: 'admin'
      });
    } else {
      return res.status(401).json({ success: false, message: 'รหัสผู้ใช้งานหรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' });
    }
  }

  // Teacher/Staff Role Check
  if (role === 'teacher') {
    const teacher = db.teachers.find(t => t.username.toLowerCase() === username.toLowerCase());
    if (teacher && teacher.isRegistered && teacher.password === password) {
      return res.json({
        success: true,
        user: { id: teacher.username, username: teacher.username, name: teacher.name },
        role: 'teacher'
      });
    } else {
      return res.status(401).json({ success: false, message: 'รหัสผู้ใช้งานหรือรหัสผ่านของคุณครูไม่ถูกต้อง' });
    }
  }

  // Student Role Check
  if (role === 'student') {
    const student = db.students.find(s => s.id === username);
    if (student) {
      if (!student.isRegistered) {
        return res.status(400).json({
          success: false,
          needsRegistration: true,
          student: { id: student.id, name: student.name, department: student.department },
          message: 'รหัสนักศึกษานี้ยังไม่ได้ลงทะเบียนบัญชี กรุณาลงทะเบียนรหัสผ่านก่อนเข้าใช้งานครั้งแรก'
        });
      }
      if (student.password === password) {
        return res.json({
          success: true,
          user: { id: student.id, username: student.id, name: student.name, department: student.department },
          role: 'student'
        });
      } else {
        return res.status(401).json({ success: false, message: 'รหัสผ่านของนักเรียนไม่ถูกต้อง' });
      }
    } else {
      return res.status(404).json({ success: false, message: 'ไม่พบรหัสนักเรียนนี้ในระบบ กรุณาติดต่อคุณครูเพื่อลงทะเบียนรายชื่อก่อน' });
    }
  }

  return res.status(400).json({ success: false, message: 'บทบาทผู้ใช้ไม่ถูกต้อง' });
});

// 2. Register Endpoint (for students and teachers)
app.post('/api/auth/register', (req, res) => {
  const { id, username, name, password, department, position, role } = req.body;
  const db = readDB();

  if (role === 'student') {
    if (!id || !password) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสนักเรียนและรหัสผ่าน' });
    }

    const index = db.students.findIndex(s => s.id === id);
    if (index !== -1) {
      if (db.students[index].isRegistered) {
        return res.status(400).json({ success: false, message: 'รหัสนักเรียนนี้ได้ลงทะเบียนบัญชีเรียบร้อยแล้ว' });
      }
      db.students[index].password = password;
      db.students[index].isRegistered = true;
      if (name) db.students[index].name = name;
      if (department) db.students[index].department = department;
    } else {
      db.students.push({
        id,
        name: name || 'นักเรียนทั่วไป',
        department: department || 'ทั่วไป',
        password,
        isRegistered: true,
        createdAt: new Date().toISOString()
      });
    }

    writeDB(db);
    return res.json({ success: true, message: 'ลงทะเบียนนักเรียนสำเร็จแล้ว สามารถเข้าสู่ระบบได้ทันที' });
  }

  if (role === 'teacher') {
    if (!username || !password || !name) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลชื่อบัญชี ชื่อ-นามสกุล และรหัสผ่าน' });
    }

    const existing = db.teachers.find(t => t.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      return res.status(400).json({ success: false, message: 'ชื่อผู้ใช้งานสำหรับคุณครูนี้มีในระบบแล้ว' });
    }

    db.teachers.push({
      username,
      name,
      position: position || 'คุณครู',
      password,
      isRegistered: true,
      createdAt: new Date().toISOString()
    });

    writeDB(db);
    return res.json({ success: true, message: 'ลงทะเบียนคุณครูสำเร็จแล้ว' });
  }

  return res.status(400).json({ success: false, message: 'บทบาทไม่ถูกต้อง' });
});

// 3. Books API: GET, POST, PUT, DELETE
app.get('/api/books', (req, res) => {
  const db = readDB();
  res.json(db.books);
});

app.post('/api/books', (req, res) => {
  const { id, title, author, category, receivedQty, location, coverUrl, curriculum } = req.body;
  if (!id || !title || !author || !category) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลหนังสือที่จำเป็นให้ครบถ้วน (รหัส, ชื่อหนังสือ, ผู้แต่ง, หมวดหมู่)' });
  }

  const db = readDB();
  const existing = db.books.find(b => b.id === id);
  if (existing) {
    return res.status(400).json({ success: false, message: `มีหนังสือรหัส ${id} นี้ในระบบแล้ว` });
  }

  const parsedReceivedQty = Number(receivedQty) || 0;
  const newBook: Book = {
    id,
    title,
    author,
    category,
    receivedQty: parsedReceivedQty,
    givenOutQty: 0,
    stockQty: parsedReceivedQty,
    location: location || '',
    coverUrl: coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    curriculum: curriculum || '',
    createdAt: new Date().toISOString()
  };

  db.books.push(newBook);
  writeDB(db);
  res.json({ success: true, message: 'เพิ่มข้อมูลหนังสือสำเร็จ', book: newBook });
});

app.put('/api/books/:id', (req, res) => {
  const { id } = req.params;
  const { title, author, category, receivedQty, location, coverUrl, curriculum } = req.body;

  const db = readDB();
  const index = db.books.findIndex(b => b.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'ไม่พบหนังสือรหัสนี้' });
  }

  const book = db.books[index];
  if (title) book.title = title;
  if (author) book.author = author;
  if (category) book.category = category;
  if (location !== undefined) book.location = location;
  if (coverUrl !== undefined) book.coverUrl = coverUrl;
  if (curriculum !== undefined) book.curriculum = curriculum;

  if (receivedQty !== undefined) {
    const newReceived = Number(receivedQty) || 0;
    if (newReceived < book.givenOutQty) {
      return res.status(400).json({ success: false, message: `ไม่สามารถปรับยอดนำเข้าให้น้อยกว่าจำนวนที่จ่ายออก/ถูกยืมไปแล้ว (${book.givenOutQty} เล่ม) ได้` });
    }
    book.receivedQty = newReceived;
    book.stockQty = book.receivedQty - book.givenOutQty;
  }

  writeDB(db);
  res.json({ success: true, message: 'อัปเดตข้อมูลหนังสือสำเร็จ', book });
});

app.delete('/api/books/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const originalLength = db.books.length;

  // Check if book has active borrow records
  const hasActiveBorrows = db.transactions.some(tx => tx.bookId === id && (tx.status === 'pending' || tx.status === 'approved'));
  if (hasActiveBorrows) {
    return res.status(400).json({ success: false, message: 'ไม่สามารถลบหนังสือเล่มนี้ได้ เนื่องจากยังมีรายการขอยืมค้างอยู่หรือยังไม่ได้คืน' });
  }

  db.books = db.books.filter(b => b.id !== id);

  if (db.books.length === originalLength) {
    return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลหนังสือเล่มนี้' });
  }

  // Optional: clear historic transactions for this book
  db.transactions = db.transactions.filter(tx => tx.bookId !== id);

  writeDB(db);
  res.json({ success: true, message: 'ลบข้อมูลหนังสือเรียบร้อยแล้ว' });
});

// 4. Import Books from Google Sheets CSV
app.post('/api/books/import-sheets', async (req, res) => {
  const { sheetUrl } = req.body;
  if (!sheetUrl) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกลิงก์ Google Sheets' });
  }

  try {
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return res.status(400).json({ success: false, message: 'รูปแบบลิงก์ Google Sheets ไม่ถูกต้อง' });
    }

    const spreadsheetId = match[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

    const response = await fetch(csvUrl);
    if (!response.ok) {
      return res.status(400).json({ success: false, message: 'ไม่สามารถดาวน์โหลดข้อมูลได้ กรุณาตรวจสอบสิทธิ์การแชร์ให้ทุกคนมีลิงก์ดูได้' });
    }

    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/);
    
    if (lines.length <= 1) {
      return res.status(400).json({ success: false, message: 'ไม่พบข้อมูลหนังสือใน Google Sheet หรือไฟล์ว่างเปล่า' });
    }

    const db = readDB();
    let importedCount = 0;
    let updatedCount = 0;

    // Header row mapping (Case-insensitive & Thai support)
    // We parse the headers first to support dynamic columns
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const findIndex = (keywords: string[]) => {
      return headers.findIndex(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));
    };

    const idIndex = findIndex(['id', 'รหัสหนังสือ', 'รหัส']);
    const titleIndex = findIndex(['title', 'book', 'ชื่อหนังสือ', 'ชื่อ']);
    const authorIndex = findIndex(['author', 'ผู้แต่ง', 'ผู้เขียน']);
    const categoryIndex = findIndex(['category', 'หมวดหมู่', 'ประเภท']);
    const qtyIndex = findIndex(['qty', 'received', 'จำนวน', 'นำเข้า']);
    const locationIndex = findIndex(['location', 'shelf', 'ที่เก็บ', 'ชั้นวาง']);
    const curriculumIndex = findIndex(['curriculum', 'หลักสูตร', 'รายวิชา', 'หลักสูตรการสอน']);

    // Check if essential columns are present
    if (idIndex === -1 || titleIndex === -1) {
      return res.status(400).json({ 
        success: false, 
        message: 'ข้อมูลในชีตไม่ครบถ้วน! ต้องมีคอลัมน์ "รหัสหนังสือ" และ "ชื่อหนังสือ" เป็นอย่างน้อย' 
      });
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV accounting for quotes
      const columns: string[] = [];
      let currentVal = '';
      let inQuotes = false;
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          columns.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      columns.push(currentVal.trim());

      const bookId = columns[idIndex]?.replace(/"/g, '').trim();
      const bookTitle = columns[titleIndex]?.replace(/"/g, '').trim();
      const bookAuthor = authorIndex !== -1 ? (columns[authorIndex]?.replace(/"/g, '').trim() || 'ไม่ระบุ') : 'ไม่ระบุ';
      const bookCategory = categoryIndex !== -1 ? (columns[categoryIndex]?.replace(/"/g, '').trim() || 'ทั่วไป') : 'ทั่วไป';
      const bookQty = qtyIndex !== -1 ? (Number(columns[qtyIndex]?.replace(/"/g, '').trim()) || 0) : 0;
      const bookLoc = locationIndex !== -1 ? (columns[locationIndex]?.replace(/"/g, '').trim() || '') : '';
      const bookCurriculum = curriculumIndex !== -1 ? (columns[curriculumIndex]?.replace(/"/g, '').trim() || '') : '';

      if (!bookId || !bookTitle) continue;

      const existingIndex = db.books.findIndex(b => b.id === bookId);
      if (existingIndex !== -1) {
        // Update existing book
        db.books[existingIndex].title = bookTitle;
        db.books[existingIndex].author = bookAuthor;
        db.books[existingIndex].category = bookCategory;
        if (bookLoc) db.books[existingIndex].location = bookLoc;
        if (bookCurriculum) db.books[existingIndex].curriculum = bookCurriculum;
        
        // Ensure new quantity isn't less than currently given-out quantity
        const curGivenOut = db.books[existingIndex].givenOutQty;
        if (bookQty >= curGivenOut) {
          db.books[existingIndex].receivedQty = bookQty;
          db.books[existingIndex].stockQty = bookQty - curGivenOut;
        }
        updatedCount++;
      } else {
        // Create new book
        db.books.push({
          id: bookId,
          title: bookTitle,
          author: bookAuthor,
          category: bookCategory,
          receivedQty: bookQty,
          givenOutQty: 0,
          stockQty: bookQty,
          location: bookLoc,
          curriculum: bookCurriculum,
          coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
          createdAt: new Date().toISOString()
        });
        importedCount++;
      }
    }

    writeDB(db);
    return res.json({
      success: true,
      message: `นำเข้าสำเร็จ! เพิ่มหนังสือใหม่ ${importedCount} เรื่อง และอัปเดตข้อมูล ${updatedCount} เรื่อง`,
      importedCount,
      updatedCount
    });
  } catch (error: any) {
    console.error('Error importing books from Google Sheet:', error);
    return res.status(500).json({ success: false, message: `เกิดข้อผิดพลาดในการดึงข้อมูลชีต: ${error.message}` });
  }
});

// Import Students from Google Sheets CSV
app.post('/api/students/import-sheets', async (req, res) => {
  const { sheetUrl } = req.body;
  if (!sheetUrl) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกลิงก์ Google Sheets สำหรับข้อมูลรายชื่อนักเรียน' });
  }

  try {
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return res.status(400).json({ success: false, message: 'รูปแบบลิงก์ Google Sheets ไม่ถูกต้อง' });
    }

    const spreadsheetId = match[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

    const response = await fetch(csvUrl);
    if (!response.ok) {
      return res.status(400).json({ success: false, message: 'ไม่สามารถดาวน์โหลดข้อมูลได้ กรุณาตรวจสอบสิทธิ์การแชร์ให้ทุกคนมีลิงก์ดูได้' });
    }

    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/);
    
    if (lines.length <= 1) {
      return res.status(400).json({ success: false, message: 'ไม่พบข้อมูลนักเรียนใน Google Sheet หรือไฟล์ว่างเปล่า' });
    }

    const db = readDB();
    let importedCount = 0;
    let updatedCount = 0;

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const findIndex = (keywords: string[]) => {
      return headers.findIndex(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));
    };

    const idIndex = findIndex(['id', 'รหัสประจำตัว', 'รหัสนักเรียน', 'รหัสนักศึกษา', 'รหัส']);
    const nameIndex = findIndex(['name', 'ชื่อ-นามสกุล', 'ชื่อ', 'ชื่อผู้รับ']);
    const deptIndex = findIndex(['department', 'dept', 'ห้องเรียน', 'สาขา', 'แผนกวิชา', 'ห้อง', 'ชั้นปี']);

    if (idIndex === -1 || nameIndex === -1) {
      return res.status(400).json({ 
        success: false, 
        message: 'ข้อมูลในชีตไม่ครบถ้วน! ต้องมีคอลัมน์ "รหัสนักเรียน" และ "ชื่อ-นามสกุล" เป็นอย่างน้อย' 
      });
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns: string[] = [];
      let currentVal = '';
      let inQuotes = false;
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          columns.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      columns.push(currentVal.trim());

      const studentId = columns[idIndex]?.replace(/"/g, '').trim();
      const studentName = columns[nameIndex]?.replace(/"/g, '').trim();
      const studentDept = deptIndex !== -1 ? (columns[deptIndex]?.replace(/"/g, '').trim() || 'ทั่วไป') : 'ทั่วไป';

      if (!studentId || !studentName) continue;

      const existingIndex = db.students.findIndex(s => s.id === studentId);
      if (existingIndex !== -1) {
        db.students[existingIndex].name = studentName;
        db.students[existingIndex].department = studentDept;
        updatedCount++;
      } else {
        db.students.push({
          id: studentId,
          name: studentName,
          department: studentDept,
          isRegistered: false,
          createdAt: new Date().toISOString()
        });
        importedCount++;
      }
    }

    writeDB(db);
    return res.json({
      success: true,
      message: `นำเข้าข้อมูลนักเรียนสำเร็จ! เพิ่มรายชื่อใหม่ ${importedCount} คน และอัปเดตข้อมูล ${updatedCount} คน`,
      importedCount,
      updatedCount
    });
  } catch (error: any) {
    console.error('Error importing students from Google Sheet:', error);
    return res.status(500).json({ success: false, message: `เกิดข้อผิดพลาดในการดึงข้อมูลรายชื่อนักเรียน: ${error.message}` });
  }
});

// Import Teachers from Google Sheets CSV
app.post('/api/teachers/import-sheets', async (req, res) => {
  const { sheetUrl } = req.body;
  if (!sheetUrl) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกลิงก์ Google Sheets สำหรับข้อมูลคุณครู/อาจารย์' });
  }

  try {
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return res.status(400).json({ success: false, message: 'รูปแบบลิงก์ Google Sheets ไม่ถูกต้อง' });
    }

    const spreadsheetId = match[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

    const response = await fetch(csvUrl);
    if (!response.ok) {
      return res.status(400).json({ success: false, message: 'ไม่สามารถดาวน์โหลดข้อมูลได้ กรุณาตรวจสอบสิทธิ์การแชร์ให้ทุกคนมีลิงก์ดูได้' });
    }

    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/);

    if (lines.length <= 1) {
      return res.status(400).json({ success: false, message: 'ไม่พบข้อมูลคุณครูใน Google Sheet หรือไฟล์ว่างเปล่า' });
    }

    const db = readDB();
    let importedCount = 0;
    let updatedCount = 0;

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    const findIndex = (keywords: string[]) => {
      return headers.findIndex(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));
    };

    const usernameIndex = findIndex(['username', 'ชื่อผู้ใช้งาน', 'รหัสอาจารย์', 'ชื่อบัญชี', 'ชื่อล็อกอิน', 'รหัสคุณครู']);
    const nameIndex = findIndex(['name', 'ชื่อ-นามสกุล', 'ชื่อจริง', 'ครู', 'อาจารย์', 'ชื่อผู้สอน']);
    const positionIndex = findIndex(['position', 'ตำแหน่ง', 'ตำเเหน่ง', 'หน้าที่', 'กลุ่มสาระ', 'ฝ่าย']);
    const passwordIndex = findIndex(['password', 'รหัสผ่าน', 'พาสเวิร์ด']);

    if (nameIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลในชีตไม่ครบถ้วน! ต้องมีคอลัมน์ "ชื่อ-นามสกุล" เป็นอย่างน้อย'
      });
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns: string[] = [];
      let currentVal = '';
      let inQuotes = false;
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          columns.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      columns.push(currentVal.trim());

      const teacherName = columns[nameIndex]?.replace(/"/g, '').trim();
      if (!teacherName) continue;

      // Fallback username to clean name if username column is missing
      let teacherUsername = usernameIndex !== -1 ? columns[usernameIndex]?.replace(/"/g, '').trim() : '';
      if (!teacherUsername) {
        teacherUsername = teacherName.replace(/\s+/g, ''); // strip spaces
      }

      const teacherPosition = positionIndex !== -1 ? (columns[positionIndex]?.replace(/"/g, '').trim() || 'คุณครู') : 'คุณครู';

      let teacherPassword = passwordIndex !== -1 ? (columns[passwordIndex]?.replace(/"/g, '').trim()) : '';
      if (!teacherPassword) {
        teacherPassword = teacherUsername; // default password is username itself
      }

      if (!teacherUsername || !teacherName) continue;

      const existingIndex = db.teachers.findIndex(t => t.username.toLowerCase() === teacherUsername.toLowerCase());
      if (existingIndex !== -1) {
        db.teachers[existingIndex].name = teacherName;
        db.teachers[existingIndex].position = teacherPosition;
        if (teacherPassword) {
          db.teachers[existingIndex].password = teacherPassword;
        }
        updatedCount++;
      } else {
        db.teachers.push({
          username: teacherUsername,
          name: teacherName,
          position: teacherPosition,
          password: teacherPassword || '123456',
          isRegistered: true,
          createdAt: new Date().toISOString()
        });
        importedCount++;
      }
    }

    writeDB(db);
    return res.json({
      success: true,
      message: `นำเข้าข้อมูลครู/อาจารย์สำเร็จ! เพิ่มรายชื่อใหม่ ${importedCount} ท่าน และอัปเดตข้อมูล ${updatedCount} ท่าน`,
      importedCount,
      updatedCount
    });
  } catch (error: any) {
    console.error('Error importing teachers from Google Sheet:', error);
    return res.status(500).json({ success: false, message: `เกิดข้อผิดพลาดในการดึงข้อมูลครู/อาจารย์: ${error.message}` });
  }
});

// 5. Transactions (Borrowing, Distributions, Returns) API
app.get('/api/transactions', (req, res) => {
  const { userId } = req.query;
  const db = readDB();

  if (userId) {
    const userTx = db.transactions.filter(tx => tx.userId === userId);
    return res.json(userTx);
  }

  res.json(db.transactions);
});

// Request borrowing (student) or log direct distribution/received (teacher/admin)
app.post('/api/transactions', (req, res) => {
  const { bookId, userId, userName, userRole, qty, type, notes, approvedBy } = req.body;

  if (!bookId || !userId || !qty) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุข้อมูล หนังสือ, ผู้ใช้งาน และจำนวน' });
  }

  const db = readDB();
  const book = db.books.find(b => b.id === bookId);

  if (!book) {
    return res.status(404).json({ success: false, message: 'ไม่พบหนังสือที่ระบุ' });
  }

  const txQty = Number(qty) || 1;

  if (type === 'borrow') {
    // If student borrows, check if there is enough stock available
    if (book.stockQty < txQty) {
      return res.status(400).json({ success: false, message: `ขออภัย หนังสือไม่พอให้ยืม (คงเหลือ ${book.stockQty} เล่ม)` });
    }

    // Creating a pending transaction
    const newTx: BookTransaction = {
      id: 'tx_' + Date.now(),
      bookId: book.id,
      bookTitle: book.title,
      userId,
      userName: userName || 'นักเรียนทั่วไป',
      userRole: userRole || 'student',
      qty: txQty,
      type: 'borrow',
      status: 'pending', // Waiting for Teacher/Admin approval
      timestamp: new Date().toISOString(),
      notes: notes || ''
    };

    db.transactions.push(newTx);
    writeDB(db);

    return res.json({ success: true, message: 'ส่งคำขอยืมหนังสือเรียบร้อยแล้ว กรุณารอคุณครูอนุมัติ', transaction: newTx });
  }

  if (type === 'give_out') {
    // Direct book giveaway / distribution (Logged by Teacher/Admin)
    if (book.stockQty < txQty) {
      return res.status(400).json({ success: false, message: `ไม่สามารถแจกหนังสือได้เนื่องจากจำนวนหนังสือไม่พอ (คงเหลือ ${book.stockQty} เล่ม)` });
    }

    book.givenOutQty += txQty;
    book.stockQty = book.receivedQty - book.givenOutQty;

    const newTx: BookTransaction = {
      id: 'tx_' + Date.now(),
      bookId: book.id,
      bookTitle: book.title,
      userId,
      userName: userName || 'ผู้รับหนังสือ',
      userRole: userRole || 'student',
      qty: txQty,
      type: 'give_out',
      status: 'approved', // Auto-approved because logged by Staff
      timestamp: new Date().toISOString(),
      approvedBy: approvedBy || 'คุณครู',
      notes: notes || 'แจกหนังสือขาดตัว'
    };

    db.transactions.push(newTx);
    writeDB(db);

    return res.json({ success: true, message: 'บันทึกการแจกจ่ายหนังสือสำเร็จ', transaction: newTx });
  }

  if (type === 'import') {
    // Manual book receive/import (Logged by Teacher/Admin)
    book.receivedQty += txQty;
    book.stockQty = book.receivedQty - book.givenOutQty;

    const newTx: BookTransaction = {
      id: 'tx_' + Date.now(),
      bookId: book.id,
      bookTitle: book.title,
      userId,
      userName: userName || 'ฝ่ายคลังหนังสือ',
      userRole: 'teacher',
      qty: txQty,
      type: 'import',
      status: 'approved',
      timestamp: new Date().toISOString(),
      approvedBy: approvedBy || 'คุณครู',
      notes: notes || 'นำเข้าหนังสือเพิ่ม'
    };

    db.transactions.push(newTx);
    writeDB(db);

    return res.json({ success: true, message: 'บันทึกการนำเข้าหนังสือเพิ่มเติมสำเร็จ', transaction: newTx });
  }

  return res.status(400).json({ success: false, message: 'ประเภทธุรกรรมไม่ถูกต้อง' });
});

// Approve pending borrow request
app.post('/api/transactions/:id/approve', (req, res) => {
  const { id } = req.params;
  const { approvedBy } = req.body;

  const db = readDB();
  const tx = db.transactions.find(t => t.id === id);

  if (!tx) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการธุรกรรมนี้' });
  }

  if (tx.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'รายการนี้ได้รับการพิจารณาไปแล้ว' });
  }

  const book = db.books.find(b => b.id === tx.bookId);
  if (!book) {
    return res.status(404).json({ success: false, message: 'ไม่พบรหัสหนังสือเล่มนี้ในระบบ' });
  }

  if (book.stockQty < tx.qty) {
    return res.status(400).json({ success: false, message: `หนังสือไม่พอให้อนุมัติ (คงเหลือ ${book.stockQty} เล่ม)` });
  }

  // Update book counts
  book.givenOutQty += tx.qty;
  book.stockQty = book.receivedQty - book.givenOutQty;

  // Update transaction status
  tx.status = 'approved';
  tx.approvedBy = approvedBy || 'คุณครู';

  writeDB(db);
  res.json({ success: true, message: 'อนุมัติการยืมหนังสือเรียบร้อยแล้ว', transaction: tx });
});

// Reject pending borrow request
app.post('/api/transactions/:id/reject', (req, res) => {
  const { id } = req.params;
  const { approvedBy, notes } = req.body;

  const db = readDB();
  const tx = db.transactions.find(t => t.id === id);

  if (!tx) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการธุรกรรมนี้' });
  }

  if (tx.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'รายการนี้ได้รับการพิจารณาไปแล้ว' });
  }

  tx.status = 'rejected';
  tx.approvedBy = approvedBy || 'คุณครู';
  if (notes) tx.notes = notes;

  writeDB(db);
  res.json({ success: true, message: 'ปฏิเสธการขอยืมหนังสือเรียบร้อยแล้ว', transaction: tx });
});

// Return a borrowed book
app.post('/api/transactions/:id/return', (req, res) => {
  const { id } = req.params;
  const { approvedBy } = req.body;

  const db = readDB();
  const tx = db.transactions.find(t => t.id === id);

  if (!tx) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการธุรกรรมนี้' });
  }

  if (tx.status !== 'approved') {
    return res.status(400).json({ success: false, message: 'รายการนี้ไม่มีการยืมที่ได้รับการอนุมัติอยู่' });
  }

  const book = db.books.find(b => b.id === tx.bookId);
  if (!book) {
    return res.status(404).json({ success: false, message: 'ไม่พบหนังสือเล่มนี้ในระบบ' });
  }

  // Decrease givenOutQty, increase stockQty
  book.givenOutQty = Math.max(0, book.givenOutQty - tx.qty);
  book.stockQty = book.receivedQty - book.givenOutQty;

  // Update transaction status
  tx.status = 'returned';
  tx.returnDate = new Date().toISOString();
  tx.approvedBy = approvedBy || 'คุณครู';

  writeDB(db);
  res.json({ success: true, message: 'บันทึกคืนหนังสือเข้าคลังเรียบร้อยแล้ว', transaction: tx });
});

// 6. Users (Students / Teachers) CRUD API

// Student Operations
app.get('/api/students', (req, res) => {
  const db = readDB();
  res.json(db.students);
});

app.post('/api/students', (req, res) => {
  const { id, name, department } = req.body;
  if (!id || !name || !department) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสนักเรียน ชื่อ และห้องเรียน/สาขา' });
  }

  const db = readDB();
  const existing = db.students.find(s => s.id === id);
  if (existing) {
    return res.status(400).json({ success: false, message: 'มีรหัสนักเรียนนี้ในระบบแล้ว' });
  }

  const newStudent: Student = {
    id,
    name,
    department,
    isRegistered: false,
    createdAt: new Date().toISOString()
  };

  db.students.push(newStudent);
  writeDB(db);
  res.json({ success: true, message: 'เพิ่มข้อมูลนักเรียนสำเร็จ', student: newStudent });
});

app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const originalLength = db.students.length;
  db.students = db.students.filter(s => s.id !== id);

  if (db.students.length === originalLength) {
    return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลนักเรียนนี้' });
  }

  writeDB(db);
  res.json({ success: true, message: 'ลบข้อมูลนักเรียนเรียบร้อยแล้ว' });
});

// Teacher Operations
app.get('/api/teachers', (req, res) => {
  const db = readDB();
  const cleanTeachers = db.teachers.map(({ password, ...t }) => t);
  res.json(cleanTeachers);
});

app.delete('/api/teachers/:username', (req, res) => {
  const { username } = req.params;
  const db = readDB();
  db.teachers = db.teachers.filter(t => t.username.toLowerCase() !== username.toLowerCase());
  writeDB(db);
  res.json({ success: true, message: 'ลบข้อมูลคุณครูเรียบร้อยแล้ว' });
});

// 7. General statistics API
app.get('/api/stats', (req, res) => {
  const db = readDB();
  
  const totalBooks = db.books.length;
  let totalReceived = 0;
  let totalGivenOut = 0;
  let totalAvailable = 0;
  
  db.books.forEach(b => {
    totalReceived += b.receivedQty;
    totalGivenOut += b.givenOutQty;
    totalAvailable += b.stockQty;
  });

  const totalPendingBorrows = db.transactions.filter(t => t.status === 'pending' && t.type === 'borrow').length;
  const totalActiveBorrows = db.transactions.filter(t => t.status === 'approved' && t.type === 'borrow').length;

  res.json({
    totalBooks,
    totalReceived,
    totalGivenOut,
    totalAvailable,
    totalPendingBorrows,
    totalActiveBorrows
  });
});

// 8. Admin DB Reset
app.post('/api/admin/reset-db', (req, res) => {
  const { confirmCode } = req.body;
  if (confirmCode !== 'RESET-44120') {
    return res.status(400).json({ success: false, message: 'รหัสยืนยันไม่ถูกต้อง' });
  }

  const initial = getInitialDB();
  writeDB(initial);
  res.json({ success: true, message: 'รีเซ็ตฐานข้อมูลหนังสือเป็นค่าเริ่มต้นเรียบร้อยแล้ว' });
});

// --- Vite/Static Serving Setup ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
