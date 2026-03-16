import { auth } from './app.js';
import { LedgerApp } from "./app.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const loginBtn = document.getElementById('loginBtn');
const resetModal = document.getElementById('resetModal');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalText = document.getElementById('modalText');
const modalActions = document.getElementById('modalActions');
const okBtn = document.getElementById('okBtn');

LedgerApp.initAuth(false, () => {
    console.log("Guest access confirmed");
});


// Sign In Logic
loginBtn.onclick = async () => {
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;
  if (!email || !pass) return alert('Fill all fields');

  loginBtn.innerText = 'Logging in...';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    window.location.href = 'dashboard.html';
  } catch (err) {
    alert(err.message);
    loginBtn.innerText = 'Log In';
  }
};

// Forgot Password Logic
document.getElementById('forgotPassword').onclick = (e) => {
  e.preventDefault();
  resetModal.style.display = 'flex';
};

document.getElementById('confirmReset').onclick = async () => {
  const email = document.getElementById('login-email').value;
  const confirmBtn = document.getElementById('confirmReset');

  if (!email) return alert('Enter email in the login field first');

  confirmBtn.disabled = true;
  confirmBtn.innerText = 'Sending...';

  try {
    await sendPasswordResetEmail(auth, email);

    modalIcon.innerText = 'check_circle';
    modalIcon.style.color = '#4cd964';
    modalTitle.innerText = 'Email Sent!';
    modalText.innerText =
      'Please check your inbox (and spam folder) for instructions to reset your password.';
    modalActions.style.display = 'none';
    okBtn.style.display = 'block';
  } catch (err) {
    modalIcon.innerText = 'error';
    modalIcon.style.color = '#ff453a';
    modalTitle.innerText = 'Failed';
    modalText.innerText =
      err.code === 'auth/user-not-found'
        ? 'No account exists with this email.'
        : err.message;
    modalActions.style.display = 'none';
    okBtn.style.display = 'block';
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerText = 'Send Link';
  }
};

// Close Modal
document.getElementById('closeModal').onclick = () =>
  (resetModal.style.display = 'none');
okBtn.onclick = () => (resetModal.style.display = 'none');
window.onclick = (event) => {
  if (event.target == resetModal) resetModal.style.display = 'none';
};