import { LedgerApp } from './app.js';


 LedgerApp.initAuth(false, () => {
    console.log("Guest access confirmed");
});

document.getElementById('signupBtn').onclick = async () => {
    const name = document.getElementById('reg-name').value;
    const shop = document.getElementById('reg-shop').value;
    const email = document.getElementById('reg-email').value;
    const mobile = document.getElementById('reg-mobile').value;
    const pass = document.getElementById('reg-password').value;
    const confirmPass = document.getElementById('reg-confirm').value;



    // Validation checks
    if (!name || !shop || !email || !pass) {
        alert("Please fill in all fields");
        return;
    }
    if (pass !== confirmPass) {
        alert("Passwords do not match!");
        return;
    }
    if (pass.length < 6) {
        alert("Password must be at least 6 characters");
        return;
    }
    try {
        // Call the external app service for sign up
        await LedgerApp.signUp(email, pass, name, shop, mobile);
        // Mark the session as active and redirect
        localStorage.setItem("ApnaKhata_session", "active");
        window.location.href = 'dashboard.html';
    } catch (err) {
        alert("Registration Failed: " + err.message);
    }
};