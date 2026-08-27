// js/verify-otp.js

const userId = localStorage.getItem('pending_user_id');
const email = localStorage.getItem('pending_email');

if (email) {
  document.getElementById('emailDisplay').textContent = email;
}

// If someone opens this page without registering first, send them back
if (!userId) {
  alert('No pending registration found. Please register first.');
  window.location.href = 'register.html';
}

document.getElementById('otpForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const messageBox = document.getElementById('message');
  const otpCode = document.getElementById('otp_code').value;

  try {
    const response = await fetch(`${API_BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, otp_code: otpCode })
    });

    const data = await response.json();

    if (data.success) {
      messageBox.className = 'message success';
      messageBox.textContent = 'Verified! Redirecting to login...';
      localStorage.removeItem('pending_user_id');
      localStorage.removeItem('pending_email');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } else {
      messageBox.className = 'message error';
      messageBox.textContent = data.message || 'Verification failed';
    }
  } catch (err) {
    messageBox.className = 'message error';
    messageBox.textContent = 'Could not connect to server.';
    console.error(err);
  }
});

document.getElementById('resendLink').addEventListener('click', async function (e) {
  e.preventDefault();
  const messageBox = document.getElementById('message');

  try {
    const response = await fetch(`${API_BASE_URL}/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });

    const data = await response.json();
    messageBox.className = data.success ? 'message success' : 'message error';
    messageBox.textContent = data.message;
  } catch (err) {
    messageBox.className = 'message error';
    messageBox.textContent = 'Could not connect to server.';
    console.error(err);
  }
});