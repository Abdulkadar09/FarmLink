// js/login.js

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const messageBox = document.getElementById('message');

  const payload = {
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  };

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.success) {
      messageBox.className = 'message success';
      messageBox.textContent = `Welcome, ${data.user.full_name}! (${data.user.role})`;

      // Save logged-in user info for later use across the app
      localStorage.setItem('loggedInUser', JSON.stringify(data.user));

      // Redirect based on role
      setTimeout(() => {
        if (data.user.role === 'Farmer') {
          window.location.href = 'farmer-dashboard.html';
        } else {
          // Buyer dashboard will be built in the next module (Search & Discovery)
          messageBox.textContent += ' (Buyer dashboard coming soon)';
        }
      }, 1000);

    } else {
      messageBox.className = 'message error';
      messageBox.textContent = data.message || 'Login failed';

      // If not verified, offer to go to OTP page
      if (data.user_id) {
        localStorage.setItem('pending_user_id', data.user_id);
        localStorage.setItem('pending_email', payload.email);
        messageBox.innerHTML += ' <a href="verify-otp.html">Verify now</a>';
      }
    }
  } catch (err) {
    messageBox.className = 'message error';
    messageBox.textContent = 'Could not connect to server.';
    console.error(err);
  }
});