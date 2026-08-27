// js/farmer-dashboard.js

const CROP_API = 'http://localhost:5000/api/crops';

// Get the logged-in user from localStorage (set during login)
const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');

if (!loggedInUser || loggedInUser.role !== 'Farmer') {
  alert('Please log in as a Farmer first.');
  window.location.href = 'login.html';
}

document.getElementById('farmerName').textContent = loggedInUser.full_name;

// NOTE: In our current backend, CROPS needs a farmer_id (from FARMER_PROFILE),
// not the user_id directly. For now, since we haven't built a "get my farmer_id"
// endpoint, we ask you to paste it once - a proper version would fetch this
// automatically from the backend using the logged-in user_id.
let farmerId = localStorage.getItem('farmer_id');
if (!farmerId) {
  farmerId = prompt('Enter your farmer_id (check MySQL FARMER_PROFILE table):');
  localStorage.setItem('farmer_id', farmerId);
}

let capturedLat = null;
let capturedLng = null;

// ---------------------------------------------
// Load crop dropdown from CROP_MASTER
// ---------------------------------------------
async function loadCropMaster() {
  const res = await fetch(`${CROP_API}/crop-master`);
  const data = await res.json();
  const select = document.getElementById('crop_master_id');
  select.innerHTML = '';
  data.crops.forEach(crop => {
    const option = document.createElement('option');
    option.value = crop.crop_master_id;
    option.textContent = `${crop.crop_name} (${crop.category})`;
    select.appendChild(option);
  });
  // Load mandi price for the first crop shown by default
  if (data.crops.length > 0) fetchMandiPrice();
}

// ---------------------------------------------
// Show mandi reference price for selected crop
// ---------------------------------------------
async function fetchMandiPrice() {
  const cropId = document.getElementById('crop_master_id').value;
  const res = await fetch(`${CROP_API}/price-index/${cropId}`);
  const data = await res.json();
  const hint = document.getElementById('mandiHint');
  if (data.mandi_price_per_kg) {
    hint.textContent = `Mandi reference price: Rs.${data.mandi_price_per_kg}/kg (as of ${data.updated_date})`;
  } else {
    hint.textContent = 'No mandi price data available for this crop yet.';
  }
}

// ---------------------------------------------
// Capture GPS location using the browser
// ---------------------------------------------
function captureLocation() {
  const statusBox = document.getElementById('locationStatus');
  if (!navigator.geolocation) {
    statusBox.textContent = 'Geolocation is not supported by your browser.';
    return;
  }
  statusBox.textContent = 'Fetching location...';
  navigator.geolocation.getCurrentPosition(
    (position) => {
      capturedLat = position.coords.latitude;
      capturedLng = position.coords.longitude;
      statusBox.textContent = `Location captured: ${capturedLat.toFixed(5)}, ${capturedLng.toFixed(5)}`;
    },
    (error) => {
      statusBox.textContent = 'Could not get location. Please allow location access and try again.';
      console.error(error);
    }
  );
}

// ---------------------------------------------
// Submit new listing
// ---------------------------------------------
document.getElementById('addCropForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const messageBox = document.getElementById('message');

  if (!capturedLat || !capturedLng) {
    messageBox.className = 'message error';
    messageBox.textContent = 'Please capture your GPS location before submitting.';
    return;
  }

  const payload = {
    farmer_id: parseInt(farmerId),
    crop_master_id: document.getElementById('crop_master_id').value,
    quality_grade: document.getElementById('quality_grade').value,
    total_quantity: document.getElementById('total_quantity').value,
    expected_price_per_kg: document.getElementById('expected_price_per_kg').value,
    harvest_date: document.getElementById('harvest_date').value || null,
    latitude: capturedLat,
    longitude: capturedLng,
    location_text: 'Captured via GPS'
  };

  try {
    const res = await fetch(CROP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      messageBox.className = 'message success';
      messageBox.textContent = 'Listing added successfully!';
      document.getElementById('addCropForm').reset();
      capturedLat = null;
      capturedLng = null;
      document.getElementById('locationStatus').textContent = 'Location not captured yet';
      loadMyListings(); // refresh the list below
    } else {
      messageBox.className = 'message error';
      messageBox.textContent = data.message || 'Failed to add listing';
    }
  } catch (err) {
    messageBox.className = 'message error';
    messageBox.textContent = 'Could not connect to server.';
    console.error(err);
  }
});

// ---------------------------------------------
// Load and display this farmer's listings
// ---------------------------------------------
async function loadMyListings() {
  const container = document.getElementById('listingsContainer');
  try {
    const res = await fetch(`${CROP_API}/farmer/${farmerId}`);
    const data = await res.json();

    if (!data.crops || data.crops.length === 0) {
      container.innerHTML = '<p>No listings yet.</p>';
      return;
    }

    container.innerHTML = data.crops.map(crop => `
      <div class="listing-card">
        <div>
          <strong>${crop.crop_name}</strong> - ${crop.available_quantity}kg / ${crop.total_quantity}kg available<br>
          <small>Rs.${crop.expected_price_per_kg}/kg &middot; ${crop.quality_grade}</small><br>
          ${crop.status === 'Available' ? `<small class="expire-btn" onclick="expireListing(${crop.crop_id})">Mark as Expired</small>` : ''}
        </div>
        <span class="status ${crop.status.replace(' ', '-')}">${crop.status}</span>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p>Could not load listings.</p>';
    console.error(err);
  }
}

// ---------------------------------------------
// Mark a listing as Expired
// ---------------------------------------------
async function expireListing(cropId) {
  if (!confirm('Mark this listing as Expired? This cannot be undone.')) return;

  try {
    const res = await fetch(`${CROP_API}/${cropId}/expire`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmer_id: parseInt(farmerId) })
    });
    const data = await res.json();
    if (data.success) {
      loadMyListings();
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
  }
}

// Initial load
loadCropMaster();
loadMyListings();