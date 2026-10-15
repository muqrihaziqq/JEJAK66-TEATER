const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const EVENT_FILE = path.join(DATA_DIR, 'event.json');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
const RECEIPTS_DIR = path.join(__dirname, 'uploads', 'receipts');
const QR_DIR = path.join(__dirname, 'uploads', 'qr');

// Ensure directories exist
[DATA_DIR, RECEIPTS_DIR, QR_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helper: Read & Write Data
function getEventData() {
  try {
    if (!fs.existsSync(EVENT_FILE)) return {};
    const raw = fs.readFileSync(EVENT_FILE, 'utf8').replace(/^\uFEFF/, ''); return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading event.json:', e);
    return {};
  }
}

function saveEventData(data) {
  fs.writeFileSync(EVENT_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getTicketsData() {
  try {
    if (!fs.existsSync(TICKETS_FILE)) return [];
    const raw = fs.readFileSync(TICKETS_FILE, 'utf8').replace(/^\uFEFF/, ''); return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading tickets.json:', e);
    return [];
  }
}

function saveTicketsData(data) {
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Multer Storage Configuration
const receiptStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, RECEIPTS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + ext);
  }
});

const qrStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, QR_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-qr-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|pdf/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya format fail JPG, PNG, WEBP, atau PDF dibenarkan!'));
  }
};

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: fileFilter
});

const uploadQR = multer({
  storage: qrStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: fileFilter
});

// Admin Auth Middleware
const ADMIN_TOKEN_SECRET = 'jejak66-admin-session-secure-key';

function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!token || token !== ADMIN_TOKEN_SECRET) {
    return res.status(401).json({ success: false, message: 'Akses dinafikan. Sila log masuk semula.' });
  }
  next();
}

// -------------------------------------------------------------
// PUBLIC API ROUTES
// -------------------------------------------------------------

// 1. Get Event Info (Public)
app.get('/api/event', (req, res) => {
  const event = getEventData();
  const { adminPassword, ...safeEvent } = event;
  res.json({ success: true, event: safeEvent });
});

// 2. Book Tickets (Public)
app.post('/api/tickets/book', uploadReceipt.single('receipt'), async (req, res) => {
  try {
    const { customerName, customerPhone, customerEmail, quantity, notes } = req.body;

    if (!customerName || !customerPhone || !quantity) {
      return res.status(400).json({ success: false, message: 'Sila lengkapkan nama, nombor telefon dan kuantiti tiket.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Sila muat naik bukti pembayaran (resit / slip pemindahan).' });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: 'Kuantiti tiket mestilah sekurang-kurangnya 1.' });
    }

    const event = getEventData();
    const pricePerTicket = Number(event.pricePerTicket) || 2;
    const totalPrice = qty * pricePerTicket;

    const tickets = getTicketsData();
    const refCode = 'J66-' + Math.floor(10000 + Math.random() * 90000);
    const id = 'TKT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const verificationSecret = 'VER-' + Math.random().toString(36).substring(2, 12).toUpperCase();

    const newTicket = {
      id,
      refCode,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: (customerEmail || '').trim(),
      quantity: qty,
      pricePerTicket,
      totalPrice,
      receiptFile: '/uploads/receipts/' + req.file.filename,
      originalReceiptName: req.file.originalname,
      notes: (notes || '').trim(),
      status: 'PENDING', // PENDING | APPROVED | REJECTED
      adminNote: '',
      verificationSecret,
      createdAt: new Date().toISOString(),
      approvedAt: null
    };

    tickets.unshift(newTicket);
    saveTicketsData(tickets);

    res.json({
      success: true,
      message: 'Tempahan berjaya dihantar! Pihak penganjur akan mengesahkan pembayaran anda.',
      ticket: {
        id: newTicket.id,
        refCode: newTicket.refCode,
        customerName: newTicket.customerName,
        customerPhone: newTicket.customerPhone,
        quantity: newTicket.quantity,
        totalPrice: newTicket.totalPrice,
        status: newTicket.status,
        createdAt: newTicket.createdAt
      }
    });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ success: false, message: 'Ralat memproses tempahan: ' + err.message });
  }
});

// 3. Check Booking Status (Public)
app.get('/api/tickets/status/:query', (req, res) => {
  const query = (req.params.query || '').trim().toLowerCase();
  if (!query) {
    return res.status(400).json({ success: false, message: 'Sila masukkan nombor rujukan atau nombor telefon.' });
  }

  const cleanPhone = query.replace(/\D/g, '');
  const tickets = getTicketsData();

  const matched = tickets.filter(t => {
    const matchRef = t.refCode && t.refCode.toLowerCase() === query;
    const matchId = t.id && t.id.toLowerCase() === query;
    const tCleanPhone = (t.customerPhone || '').replace(/\D/g, '');
    const matchPhone = cleanPhone.length >= 6 && tCleanPhone.includes(cleanPhone);
    return matchRef || matchId || matchPhone;
  });

  if (matched.length === 0) {
    return res.status(404).json({ success: false, message: 'Tiada rekod tempahan dijumpai untuk carian ini.' });
  }

  // Sanitize verification secret if not approved yet
  const sanitized = matched.map(t => ({
    id: t.id,
    refCode: t.refCode,
    customerName: t.customerName,
    customerPhone: t.customerPhone,
    customerEmail: t.customerEmail,
    quantity: t.quantity,
    totalPrice: t.totalPrice,
    status: t.status,
    adminNote: t.adminNote,
    createdAt: t.createdAt,
    approvedAt: t.approvedAt
  }));

  res.json({ success: true, tickets: sanitized });
});

// 4. Get Ticket for Printing / QR View (Public)
app.get('/api/tickets/:id/view', async (req, res) => {
  const idOrRef = req.params.id;
  const tickets = getTicketsData();
  const ticket = tickets.find(t => t.id === idOrRef || t.refCode === idOrRef);

  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Tiket tidak ditemui.' });
  }

  const event = getEventData();

  // Generate QR Code for Ticket verification
  const qrContent = JSON.stringify({
    event: 'JEJAK66',
    date: event.date || '2026-11-18',
    ref: ticket.refCode,
    name: ticket.customerName,
    qty: ticket.quantity,
    status: ticket.status,
    sec: ticket.verificationSecret
  });

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrContent, {
      margin: 1,
      width: 250,
      color: { dark: '#0b132b', light: '#ffffff' }
    });
  } catch (e) {
    console.error('QR code generation error:', e);
  }

  res.json({
    success: true,
    ticket,
    event: {
      title: event.title,
      tagline: event.tagline,
      dateFormatted: event.dateFormatted,
      time: event.time,
      doorsOpen: event.doorsOpen,
      venue: event.venue,
      organizer: event.organizer,
      contactPhone: event.contactPhone,
      contactEmail: event.contactEmail
    },
    qrCodeDataUrl: qrDataUrl
  });
});

// -------------------------------------------------------------
// ADMIN API ROUTES
// -------------------------------------------------------------

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const event = getEventData();
  const currentPassword = event.adminPassword || 'admin123';

  if (password === currentPassword) {
    return res.json({
      success: true,
      token: ADMIN_TOKEN_SECRET,
      message: 'Log masuk pentadbir berjaya.'
    });
  }

  res.status(401).json({ success: false, message: 'Kata laluan pentadbir tidak tepat.' });
});

// Admin Get All Tickets & Metrics
app.get('/api/admin/tickets', adminAuth, (req, res) => {
  const tickets = getTicketsData();
  const event = getEventData();

  // Calculate Metrics
  const totalBookings = tickets.length;
  let totalSoldTickets = 0;
  let totalRevenue = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;

  tickets.forEach(t => {
    if (t.status === 'APPROVED') {
      totalSoldTickets += (t.quantity || 0);
      totalRevenue += (t.totalPrice || 0);
      approvedCount++;
    } else if (t.status === 'PENDING') {
      pendingCount++;
    } else if (t.status === 'REJECTED') {
      rejectedCount++;
    }
  });

  res.json({
    success: true,
    metrics: {
      totalBookings,
      totalSoldTickets,
      totalRevenue,
      pendingCount,
      approvedCount,
      rejectedCount,
      pricePerTicket: event.pricePerTicket || 2
    },
    tickets
  });
});

// Admin Update Ticket Status (Approve / Reject)
app.put('/api/admin/tickets/:id/status', adminAuth, (req, res) => {
  const ticketId = req.params.id;
  const { status, adminNote } = req.body;

  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status tidak sah.' });
  }

  const tickets = getTicketsData();
  const index = tickets.findIndex(t => t.id === ticketId || t.refCode === ticketId);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Tempahan tidak dijumpai.' });
  }

  tickets[index].status = status;
  if (adminNote !== undefined) {
    tickets[index].adminNote = adminNote;
  }
  if (status === 'APPROVED') {
    tickets[index].approvedAt = new Date().toISOString();
  }

  saveTicketsData(tickets);

  res.json({
    success: true,
    message: `Status tempahan ${tickets[index].refCode} telah dikemas kini kepada ${status}.`,
    ticket: tickets[index]
  });
});

// Admin Update Event Info
app.put('/api/admin/event', adminAuth, (req, res) => {
  const event = getEventData();
  const allowedFields = [
    'title', 'tagline', 'dateFormatted', 'time', 'doorsOpen',
    'venue', 'pricePerTicket', 'organizer', 'contactPhone',
    'contactEmail', 'bankName', 'accountName', 'accountNumber', 'synopsis'
  ];

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      event[field] = req.body[field];
    }
  });

  saveEventData(event);
  const { adminPassword, ...safeEvent } = event;
  res.json({ success: true, message: 'Maklumat pementasan berjaya dikemas kini.', event: safeEvent });
});

// Admin Change Password
app.put('/api/admin/password', adminAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const event = getEventData();

  if ((event.adminPassword || 'admin123') !== currentPassword) {
    return res.status(400).json({ success: false, message: 'Kata laluan semasa tidak tepat.' });
  }

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ success: false, message: 'Kata laluan baharu mestilah sekurang-kurangnya 4 aksara.' });
  }

  event.adminPassword = newPassword;
  saveEventData(event);

  res.json({ success: true, message: 'Kata laluan pentadbir berjaya ditukar.' });
});

// Admin Upload Custom Payment QR Code
app.post('/api/admin/upload-qr', adminAuth, uploadQR.single('qrImage'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Tiada fail gambar QR dimuat naik.' });
  }

  const event = getEventData();
  event.qrCodePath = '/uploads/qr/' + req.file.filename;
  saveEventData(event);

  res.json({
    success: true,
    message: 'Kod QR pembayaran berjaya dikemas kini!',
    qrCodePath: event.qrCodePath
  });
});

// Admin Delete Ticket Record
app.delete('/api/admin/tickets/:id', adminAuth, (req, res) => {
  const ticketId = req.params.id;
  let tickets = getTicketsData();
  const initialLength = tickets.length;
  tickets = tickets.filter(t => t.id !== ticketId && t.refCode !== ticketId);

  if (tickets.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Tempahan tidak dijumpai.' });
  }

  saveTicketsData(tickets);
  res.json({ success: true, message: 'Rekod tempahan telah dipadam.' });
});

// Block old admin paths to protect privacy
app.get(['/admin', '/admin.html'], (req, res) => {
  res.status(404).send('<!DOCTYPE html><html><head><title>404</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h1>404 - Halaman Tidak Ditemui</h1><p><a href="/">Kembali ke Laman Utama</a></p></body></html>');
});

// Start Server listening on 0.0.0.0 (allows phone, laptop, iPad on local network)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(` Pelayan Teater JEJAK66 sedang berjalan!         `);
  console.log(` URL Laman Pembelian: http://localhost:${PORT}   `);
  console.log(` URL Admin Rahsia:    http://localhost:${PORT}/pengurusan-pentadbir.html `);
  console.log(`=================================================`);
});
