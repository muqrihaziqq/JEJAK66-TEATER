// App Logic for Public JEJAK66 Theater Ticketing

let currentPricePerTicket = 2;

document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  fetchEventDetails();
  initQuantityControls();
  initFileUpload();
  initBookingForm();
});

// 1. Countdown Timer (Target: 18 November 2026, 20:30)
function initCountdown() {
  const targetDate = new Date('2026-11-18T20:30:00+08:00').getTime();

  function update() {
    const now = new Date().getTime();
    const diff = targetDate - now;

    if (diff <= 0) {
      document.getElementById('cd-days').textContent = '00';
      document.getElementById('cd-hours').textContent = '00';
      document.getElementById('cd-mins').textContent = '00';
      document.getElementById('cd-secs').textContent = '00';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('cd-days').textContent = String(days).padStart(2, '0');
    document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('cd-mins').textContent = String(mins).padStart(2, '0');
    document.getElementById('cd-secs').textContent = String(secs).padStart(2, '0');
  }

  update();
  setInterval(update, 1000);
}

// 2. Fetch Event Details from Server
async function fetchEventDetails() {
  try {
    const res = await fetch('/api/event');
    const data = await res.json();
    if (data.success && data.event) {
      const e = data.event;
      if (e.pricePerTicket) {
        currentPricePerTicket = Number(e.pricePerTicket);
      }
      if (e.qrCodePath) {
        document.getElementById('event-qr-image').src = e.qrCodePath + '?t=' + Date.now();
      }
      if (e.accountName) document.getElementById('event-acc-name').textContent = e.accountName;
      if (e.bankName) document.getElementById('event-bank-name').textContent = e.bankName;
      if (e.accountNumber) document.getElementById('event-acc-num').textContent = e.accountNumber;

      recalculatePrice();
    }
  } catch (err) {
    console.warn('Could not fetch event info:', err);
  }
}

// 3. Ticket Quantity Stepper & Price Calculation
function initQuantityControls() {
  const qtyInput = document.getElementById('quantity');
  const btnMinus = document.getElementById('btn-minus');
  const btnPlus = document.getElementById('btn-plus');

  btnMinus.addEventListener('click', () => {
    let val = parseInt(qtyInput.value, 10) || 1;
    if (val > 1) {
      qtyInput.value = val - 1;
      recalculatePrice();
    }
  });

  btnPlus.addEventListener('click', () => {
    let val = parseInt(qtyInput.value, 10) || 1;
    if (val < 50) {
      qtyInput.value = val + 1;
      recalculatePrice();
    }
  });
}

function recalculatePrice() {
  const qty = parseInt(document.getElementById('quantity').value, 10) || 1;
  const total = qty * currentPricePerTicket;

  document.getElementById('summary-qty').textContent = `${qty} Tiket`;
  document.getElementById('summary-total').textContent = `RM ${total.toFixed(2)}`;
  document.getElementById('qr-pay-amount').textContent = `RM ${total.toFixed(2)}`;
}

// 4. File Upload (Dropzone, Preview, Remove)
function initFileUpload() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('receipt');
  const previewBox = document.getElementById('file-preview');
  const previewImg = document.getElementById('preview-img');
  const previewName = document.getElementById('preview-name');
  const previewSize = document.getElementById('preview-size');
  const btnRemove = document.getElementById('btn-remove-file');

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      handleFileSelected(fileInput.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFileSelected(fileInput.files[0]);
    }
  });

  btnRemove.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.value = '';
    previewBox.style.display = 'none';
    dropzone.style.display = 'block';
  });

  function handleFileSelected(file) {
    if (!file) return;

    // Check size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Saiz fail melebihi had 10MB!');
      fileInput.value = '';
      return;
    }

    previewName.textContent = file.name;
    previewSize.textContent = (file.size / 1024).toFixed(1) + ' KB';

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        previewImg.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      // PDF or non-image
      previewImg.src = 'https://cdn-icons-png.flaticon.com/512/337/337946.png';
      previewImg.style.display = 'block';
    }

    dropzone.style.display = 'none';
    previewBox.style.display = 'flex';
  }
}

// 5. Booking Form Submission
function initBookingForm() {
  const form = document.getElementById('booking-form');
  const btnSubmit = document.getElementById('btn-submit');
  const modalSuccess = document.getElementById('modal-success');
  const modalRef = document.getElementById('modal-ref');
  const btnCopyRef = document.getElementById('btn-copy-ref');
  const linkCheckStatus = document.getElementById('link-check-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const fileInput = document.getElementById('receipt');

    if (!name || !phone) {
      alert('Sila lengkapkan nama dan nombor telefon.');
      return;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
      alert('Sila muat naik bukti pembayaran (resit / slip pemindahan).');
      return;
    }

    const formData = new FormData(form);

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menghantar Bukti Bayaran...';

    try {
      const res = await fetch('/api/tickets/book', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success && data.ticket) {
        // Show success modal
        modalRef.textContent = data.ticket.refCode;
        linkCheckStatus.href = `status.html?ref=${encodeURIComponent(data.ticket.refCode)}`;
        modalSuccess.classList.add('active');

        // Reset form
        form.reset();
        document.getElementById('quantity').value = '1';
        recalculatePrice();
        document.getElementById('file-preview').style.display = 'none';
        document.getElementById('dropzone').style.display = 'block';
      } else {
        alert(data.message || 'Ralat berlaku semasa membuat tempahan.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Ralat rangkaian. Sila pastikan pelayan sedang aktif dan cuba lagi.');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Hantar Tempahan & Bukti Bayaran';
    }
  });

  btnCopyRef.addEventListener('click', () => {
    const text = modalRef.textContent;
    navigator.clipboard.writeText(text).then(() => {
      btnCopyRef.innerHTML = '<i class="fa-solid fa-check"></i> Disalin!';
      setTimeout(() => {
        btnCopyRef.innerHTML = '<i class="fa-regular fa-copy"></i> Salin Kod Rujukan';
      }, 2000);
    });
  });
}

function closeSuccessModal() {
  document.getElementById('modal-success').classList.remove('active');
}
