import { auth, db, LedgerApp } from './app.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const nameInput = document.getElementById('up-name');
const shopInput = document.getElementById('up-shop');
const mobileInput = document.getElementById('up-mobile');
const emailDisplay = document.getElementById('user-email-display');

// Load current user profile data
onAuthStateChanged(auth, async (user) => {
    if (user) {
        emailDisplay.innerText = user.email;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            nameInput.value = data.fullName || '';
            shopInput.value = data.shopName || '';
            mobileInput.value = data.mobile || '';
        }
    } else {
        window.location.href = 'signin.html';
    }
});

// Save updated details
document.getElementById('update-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, {
            fullName: nameInput.value,
            shopName: shopInput.value,
            mobile: mobileInput.value
        });
        alert("Profile Updated Successfully!");
        window.location.href = 'dashboard.html';
    } catch (err) {
        alert("Error: " + err.message);
        btn.innerText = "Save Profile";
        btn.disabled = false;
    }
};

document.getElementById('logoutBtn').onclick = () => {
    if (confirm("Are you sure you want to log out?")) LedgerApp.logOut();
};

// Add to the bottom of profile.js
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
    window.location.href = 'dashboard.html';
};