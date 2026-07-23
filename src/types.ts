export interface User {
  id: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  department?: string;
  password?: string;
  isRegistered: boolean;
  createdAt?: string;
}

export interface Student {
  id: string; // Student ID / Username
  name: string;
  department: string;
  password?: string;
  isRegistered: boolean;
  isLoggedIn?: boolean;
  lastLogin?: string;
  createdAt?: string;
  weight?: string;
  height?: string;
  bloodGroup?: string;
  birthdate?: string;
  religion?: string;
  age?: string;
  nickname?: string;
  email?: string;
}

export interface Teacher {
  username: string; // Teacher Username
  name: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  age?: string;
  position?: string; // ตำแหน่ง
  department?: string; // แผนกที่สอน
  subject?: string; // วิชาที่สอน
  birthdate?: string; // วันเดือนปีเกิด
  password?: string;
  isRegistered: boolean;
  createdAt?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  receivedQty: number;  // หนังสือที่เอาเข้ามาทั้งหมด
  givenOutQty: number;  // หนังสือที่เเจกออกไป หรือ กำลังถูกยืมอยู่
  stockQty: number;     // จำนวนหนังสือคงเหลือพร้อมใช้ = receivedQty - givenOutQty
  location?: string;    // ที่เก็บหนังสือ
  coverUrl?: string;    // ลิงก์รูปปก (ถ้ามี)
  curriculum?: string;  // หลักสูตรการสอน / รายวิชา
  createdAt?: string;
}

export interface BookTransaction {
  id: string;
  bookId: string;
  bookTitle: string;
  userId: string;       // รหัสนักเรียน/ผู้รับ
  userName: string;
  userRole: 'student' | 'teacher' | 'guest';
  qty: number;
  type: 'borrow' | 'give_out' | 'import'; // borrow = ยืมหนังสือ, give_out = แจกขาด, import = นำเข้าเพิ่มเติม
  status: 'pending' | 'approved' | 'returned' | 'rejected';
  timestamp: string;
  returnDate?: string;  // วันที่ส่งคืน
  approvedBy?: string;  // ผู้รับผิดชอบที่อนุมัติ (ครู/Admin)
  notes?: string;       // หมายเหตุเพิ่มเติม
}

export interface SystemStats {
  totalBooks: number;        // จำนวนประเภทหนังสือทั้งหมด
  totalReceived: number;     // หนังสือที่รับเข้ามาสะสมทั้งหมด
  totalGivenOut: number;     // หนังสือที่แจกออกไป/ถูกยืมสะสม
  totalAvailable: number;    // หนังสือคงเหลือพร้อมใช้ในตู้
  totalPendingBorrows: number; // คำขอยืมที่รออนุมัติ
  totalActiveBorrows: number;  // หนังสือที่กำลังถูกยืมอยู่ในขณะนี้
}
