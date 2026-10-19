// Admin Portal Logic for JEJAK66 Theater Ticketing

let adminToken = localStorage.getItem('jejak66_admin_token') || '';
let allTickets = [];
let currentFilter = 'ALL';
let activeModalTicket = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initLoginForm();
  initSettingsForm();
  initQRUploadForm();
  initSearch();
});

// 1. Authentication Check
function checkAuth() {
  const loginSec = document.getElementById('login-section');
  const dashSec = document.getElementById('dashboard-section');

  if (adminToken) {
    loginSec.style.display = 'none';
    dashSec.style.display = 'block';
    loadAdminTickets();
    loadEventSettings();
  } else {
    loginSec.style.display = 'flex';
    dashSec.style.display = 'none';
  }
}

function initLoginForm() {
  const form = document.getElementById('login-form');
  const btn = document.getElementById('btn-login');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-pass').value.trim();

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Log Masuk...';

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (data.success && data.token) {
        adminToken = data.token;
        localStorage.setItem('jejak66_admin_token', adminToken);
        checkAuth();
      } else {
        alert(data.message || 'Kata laluan salah!');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('Ralat pelayan semasa log masuk.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Log Masuk';
    }
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('jejak66_admin_token');
    adminToken = '';
    checkAuth();
  });
}

// 2. Fetch Tickets and Metrics
async function loadAdminTickets() {
  const tbody = document.getElementById('orders-table-body');
  try {
    const res = await fetch('/api/admin/tickets', {
      headers: { 'x-admin-token': adminToken }
    });

    if (res.status === 401) {
      alert('Sesi anda telah tamat. Sila log masuk semula.');
      localStorage.removeItem('jejak66_admin_token');
      adminToken = '';
      checkAuth();
      return;
    }

    const data = await res.json();
    if (data.success) {
      allTickets = data.tickets || [];
      updateMetrics(data.metrics);
      renderTable();
    }
  } catch (err) {
    console.error('Fetch tickets error:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--accent-red); padding: 30px;">
          <i class="fa-solid fa-triangle-exclamation"></i> Gagal memuatkan data dari pelayan.
        </td>
      </tr>
    `;
  }
}

function updateMetrics(m) {
  if (!m) return;
  document.getElementById('stat-sold-tickets').textContent = m.totalSoldTickets;
  document.getElementById('stat-revenue').textContent = `RM ${m.totalRevenue.toFixed(2)}`;
  document.getElementById('stat-pending').textContent = m.pendingCount;
  document.getElementById('stat-total-orders').textContent = m.totalBookings;

  document.getElementById('count-all').textContent = m.totalBookings;
  document.getElementById('count-pending').textContent = m.pendingCount;
  document.getElementById('count-approved').textContent = m.approvedCount;
  document.getElementById('count-rejected').textContent = m.rejectedCount;
}

// 3. Render Table with Filtering & Search
function setFilter(status, el) {
  currentFilter = status;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderTable();
}

function initSearch() {
  const searchInput = document.getElementById('admin-search-input');
  searchInput.addEventListener('input', () => {
    renderTable();
  });
}

function renderTable() {
  const tbody = document.getElementById('orders-table-body');
  const search = (document.getElementById('admin-search-input').value || '').trim().toLowerCase();

  let filtered = allTickets;

  if (currentFilter !== 'ALL') {
    filtered = filtered.filter(t => t.status === currentFilter);
  }

  if (search) {
    filtered = filtered.filter(t => {
      const matchName = (t.customerName || '').toLowerCase().includes(search);
      const matchPhone = (t.customerPhone || '').includes(search);
      const matchRef = (t.refCode || '').toLowerCase().includes(search);
      return matchName || matchPhone || matchRef;
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-dim); padding: 35px;">
          <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 8px;"></i>
          <div>Tiada rekod tempahan sepadan dijumpai.</div>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  filtered.forEach(t => {
    const dateStr = new Date(t.createdAt).toLocaleDateString('ms-MY', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let statusBadge = '';
    if (t.status === 'APPROVED') {
      statusBadge = '<span class="badge badge-approved"><i class="fa-solid fa-check"></i> Disahkan</span>';
    } else if (t.status === 'REJECTED') {
      statusBadge = '<span class="badge badge-rejected"><i class="fa-solid fa-xmark"></i> Ditolak</span>';
    } else {
      statusBadge = '<span class="badge badge-pending"><i class="fa-solid fa-clock"></i> Menunggu</span>';
    }

    const tktJson = encodeURIComponent(JSON.stringify(t));

    html += `
      <tr>
        <td style="font-family: 'Cinzel', serif; font-weight: 700; color: var(--gold-text);">${t.refCode}</td>
        <td style="font-size: 0.82rem; color: var(--text-muted); white-space: nowrap;">${dateStr}</td>
        <td style="font-weight: 600; color: #fff;">${escapeHtml(t.customerName)}</td>
        <td>
          <a href="https://wa.me/${cleanPhoneForWa(t.customerPhone)}" target="_blank" style="color: #34d399; font-weight: 600; text-decoration: underline;" title="Buka WhatsApp">
            <i class="fa-brands fa-whatsapp"></i> ${escapeHtml(t.customerPhone)}
          </a>
        </td>
        <td style="text-align: center; font-weight: 700;">${t.quantity}</td>
        <td style="font-weight: 800; color: #fff;">RM ${t.totalPrice.toFixed(2)}</td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openReceiptModal('${tktJson}')">
            <i class="fa-solid fa-receipt"></i> Lihat Bukti
          </button>
        </td>
        <td>${statusBadge}</td>
        <td style="text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; gap: 6px;">
            ${t.status !== 'APPROVED' ? `
              <button type="button" class="btn btn-success btn-sm" title="Sahkan Pembayaran" onclick="updateStatus('${t.id}', 'APPROVED')">
                <i class="fa-solid fa-check"></i>
              </button>
            ` : ''}

            ${t.status !== 'REJECTED' ? `
              <button type="button" class="btn btn-danger btn-sm" title="Tolak Pembayaran" onclick="rejectTicket('${t.id}')">
                <i class="fa-solid fa-xmark"></i>
              </button>
            ` : ''}

            <!-- E-Ticket & Invoice Links -->
            <a href="ticket.html?id=${encodeURIComponent(t.id)}&type=ticket" target="_blank" class="btn btn-secondary btn-sm" title="Buka E-Tiket">
              <i class="fa-solid fa-ticket"></i>
            </a>
            <a href="ticket.html?id=${encodeURIComponent(t.id)}&type=invoice" target="_blank" class="btn btn-secondary btn-sm" title="Buka Invois">
              <i class="fa-solid fa-file-invoice"></i>
            </a>

            <!-- Send via WhatsApp button -->
            <button type="button" class="btn btn-whatsapp btn-sm" title="Hantar Invois & E-Ticket ke WhatsApp Pembeli" onclick="sendTicketViaWhatsApp('${tktJson}')">
              <i class="fa-brands fa-whatsapp"></i> Hantar
            </button>

            <!-- Delete Record -->
            <button type="button" class="btn btn-secondary btn-sm" style="color: var(--accent-red);" title="Padam Rekod" onclick="deleteTicket('${t.id}', '${t.refCode}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// 4. Receipt Preview Modal & Direct Actions
function openReceiptModal(encodedJson) {
  const t = JSON.parse(decodeURIComponent(encodedJson));
  activeModalTicket = t;

  document.getElementById('modal-rcpt-ref').textContent = t.refCode;
  document.getElementById('modal-rcpt-name').textContent = t.customerName;
  document.getElementById('modal-rcpt-amount').textContent = `RM ${t.totalPrice.toFixed(2)} (${t.quantity} Tiket)`;
  document.getElementById('modal-rcpt-download').href = t.receiptFile;

  const img = document.getElementById('modal-rcpt-img');
  const pdf = document.getElementById('modal-rcpt-pdf');

  if (t.receiptFile.toLowerCase().endsWith('.pdf')) {
    img.style.display = 'none';
    pdf.src = t.receiptFile;
    pdf.style.display = 'block';
  } else {
    pdf.style.display = 'none';
    img.src = t.receiptFile;
    img.style.display = 'block';
  }

  // Setup modal buttons
  document.getElementById('modal-btn-approve').onclick = () => {
    updateStatus(t.id, 'APPROVED');
    closeReceiptModal();
  };

  document.getElementById('modal-btn-reject').onclick = () => {
    rejectTicket(t.id);
    closeReceiptModal();
  };

  document.getElementById('modal-receipt').classList.add('active');
}

function closeReceiptModal() {
  document.getElementById('modal-receipt').classList.remove('active');
  activeModalTicket = null;
}

// 5. Update Status (Approve / Reject)
async function updateStatus(id, status, adminNote = '') {
  try {
    const res = await fetch(`/api/admin/tickets/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken
      },
      body: JSON.stringify({ status, adminNote })
    });

    const data = await res.json();
    if (data.success) {
      loadAdminTickets();
    } else {
      alert(data.message || 'Gagal mengemas kini status.');
    }
  } catch (err) {
    console.error('Update status error:', err);
    alert('Ralat rangkaian semasa mengemas kini status.');
  }
}

function rejectTicket(id) {
  const note = prompt('Sila masukkan sebab penolakan (cth: "Bukti bayaran tidak jelas / jumlah bayaran tidak mencukupi"):', 'Bukti bayaran tidak dapat disahkan.');
  if (note !== null) {
    updateStatus(id, 'REJECTED', note.trim());
  }
}

async function deleteTicket(id, refCode) {
  if (!confirm(`Adakah anda pasti mahu memadam rekod tempahan ${refCode}? Tindakan ini tidak boleh dibatalkan.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/tickets/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': adminToken }
    });
    const data = await res.json();
    if (data.success) {
      loadAdminTickets();
    } else {
      alert(data.message || 'Gagal memadam tempahan.');
    }
  } catch (err) {
    console.error('Delete error:', err);
    alert('Ralat semasa memadam tempahan.');
  }
}

// 6. Send E-Ticket & Invoice via WhatsApp
function sendTicketViaWhatsApp(encodedJson) {
  const t = JSON.parse(decodeURIComponent(encodedJson));
  const origin = window.location.origin;
  const ticketUrl = `${origin}/ticket.html?id=${encodeURIComponent(t.id)}&type=ticket`;
  const invoiceUrl = `${origin}/ticket.html?id=${encodeURIComponent(t.id)}&type=invoice`;

  let msg = '';
  if (t.status === 'APPROVED') {
    msg = `*PENGESAHAN TIKET TEATER JEJAK66 (18/11/2026)*\n\n` +
      `Salam sejahtera *${t.customerName}*,\n\n` +
      `Pembayaran anda sebanyak *RM ${t.totalPrice.toFixed(2)}* telah *DISAHKAN LULUS* oleh pihak penganjur! 🎉\n\n` +
      `📌 *No. Rujukan:* ${t.refCode}\n` +
      `🎟️ *Bilangan Tiket:* ${t.quantity} Tiket\n` +
      `📅 *Tarikh:* 18 November 2026 (8:30 Malam)\n\n` +
      `Sila klik pautan di bawah untuk muat turun *E-Tiket Rasmi* & *Invois* anda:\n` +
      `👉 *E-Tiket Masuk:* ${ticketUrl}\n` +
      `👉 *Invois Rasmi:* ${invoiceUrl}\n\n` +
      `Sila tunjukkan E-Tiket ini di pintu panggung semasa hari pementasan. Terima kasih!`;
  } else {
    msg = `*MAKLUMAN TEMPAHAN TIKET JEJAK66*\n\n` +
      `Salam sejahtera *${t.customerName}*,\n\n` +
      `Tempahan tiket anda bernombor rujukan *${t.refCode}* kini berstatus *${t.status}*.\n` +
      `Anda boleh menyemak status terkini melalui pautan:\n` +
      `${origin}/status.html?ref=${encodeURIComponent(t.refCode)}`;
  }

  const phone = cleanPhoneForWa(t.customerPhone);
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
}

// 7. Settings Tab (Event details & QR Code Upload)
function switchAdminTab(tab) {
  const tabOrders = document.getElementById('tab-content-orders');
  const tabSettings = document.getElementById('tab-content-settings');
  const btnOrders = document.getElementById('tab-btn-orders');
  const btnSettings = document.getElementById('tab-btn-settings');

  if (tab === 'settings') {
    tabOrders.style.display = 'none';
    tabSettings.style.display = 'block';
    btnOrders.classList.remove('active');
    btnSettings.classList.add('active');
  } else {
    tabSettings.style.display = 'none';
    tabOrders.style.display = 'block';
    btnSettings.classList.remove('active');
    btnOrders.classList.add('active');
  }
}

async function loadEventSettings() {
  try {
    const res = await fetch('/api/event');
    const data = await res.json();
    if (data.success && data.event) {
      const e = data.event;
      document.getElementById('set-title').value = e.title || '';
      document.getElementById('set-dateFormatted').value = e.dateFormatted || '';
      document.getElementById('set-time').value = e.time || '';
      document.getElementById('set-venue').value = e.venue || '';
      document.getElementById('set-accountName').value = e.accountName || '';
      document.getElementById('set-accountNumber').value = e.accountNumber || '';

      if (e.qrCodePath) {
        document.getElementById('admin-current-qr-img').src = e.qrCodePath + '?t=' + Date.now();
      }
    }
  } catch (err) {
    console.error('Error loading event settings:', err);
  }
}

function initSettingsForm() {
  const form = document.getElementById('form-event-settings');
  const btn = document.getElementById('btn-save-settings');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const body = {
      title: document.getElementById('set-title').value.trim(),
      dateFormatted: document.getElementById('set-dateFormatted').value.trim(),
      time: document.getElementById('set-time').value.trim(),
      venue: document.getElementById('set-venue').value.trim(),
      accountName: document.getElementById('set-accountName').value.trim(),
      accountNumber: document.getElementById('set-accountNumber').value.trim()
    };

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

    try {
      const res = await fetch('/api/admin/event', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.success) {
        alert('Maklumat acara berjaya dikemas kini!');
      } else {
        alert(data.message || 'Gagal menyimpan.');
      }
    } catch (err) {
      console.error('Save settings error:', err);
      alert('Ralat menyimpan maklumat acara.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Maklumat Acara';
    }
  });
}

function initQRUploadForm() {
  const form = document.getElementById('form-upload-qr');
  const btn = document.getElementById('btn-save-qr');
  const fileInput = document.getElementById('qrImage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!fileInput.files || fileInput.files.length === 0) {
      alert('Sila pilih fail gambar kod QR.');
      return;
    }

    const formData = new FormData(form);

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memuat Naik QR...';

    try {
      const res = await fetch('/api/admin/upload-qr', {
        method: 'POST',
        headers: {
          'x-admin-token': adminToken
        },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        alert('Kod QR berjaya dimuat naik & diganti!');
        if (data.qrCodePath) {
          document.getElementById('admin-current-qr-img').src = data.qrCodePath + '?t=' + Date.now();
        }
        fileInput.value = '';
      } else {
        alert(data.message || 'Gagal memuat naik Kod QR.');
      }
    } catch (err) {
      console.error('QR upload error:', err);
      alert('Ralat pelayan semasa memuat naik kod QR.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Muat Naik & Ganti Kod QR';
    }
  });
}

// Helpers
function cleanPhoneForWa(phone) {
  if (!phone) return '';
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0')) {
    p = '60' + p.substring(1);
  } else if (!p.startsWith('60')) {
    p = '60' + p;
  }
  return p;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
