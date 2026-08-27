// js/register.js

function toggleProfileFields() {
  const role = document.getElementById('role').value;
  document.getElementById('farmerFields').style.display = role === 'Farmer' ? 'block' : 'none';
  document.getElementById('buyerFields').style.display = role === 'Buyer' ? 'block' : 'none';
}

document.getElementById('registerForm').addEventListener('submit', async function (e) {
  e.preventDefault(); // stop the page from refreshing on submit

  const role = document.getElementById('role').value;
  const messageBox = document.getElementById('message');

  // Build the profile object based on role
  let profile = {
    city: document.getElementById('city').value,
    state: document.getElementById('state').value,
    pincode: document.getElementById('pincode').value
  };

  if (role === 'Farmer') {
    profile.farm_location = document.getElementById('farm_location').value;
  } else {
    profile.business_type = document.getElementById('business_type').value;
    profile.business_address = document.getElementById('business_address').value;
  }

  const payload = {
    full_name: document.getElementById('full_name').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    phone_no: document.getElementById('phone_no').value,
    role: role,
    profile: profile
  };

  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.success) {
      messageBox.className = 'message success';
      messageBox.textContent = 'Registered! Redirecting to OTP verification...';

      // Pass user_id and email to the OTP page via localStorage
      localStorage.setItem('pending_user_id', data.user_id);
      localStorage.setItem('pending_email', payload.email);

      setTimeout(() => {
        window.location.href = 'verify-otp.html';
      }, 1500);
    } else {
      messageBox.className = 'message error';
      messageBox.textContent = data.message || 'Registration failed';
    }
  } catch (err) {
    messageBox.className = 'message error';
    messageBox.textContent = 'Could not connect to server. Is the backend running?';
    console.error(err);
  }
});