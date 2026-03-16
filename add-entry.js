import { LedgerApp, db, auth } from "./app.js";
import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const partyId = LedgerApp.getParam("id");
const txId = LedgerApp.getParam("txId");
const type = LedgerApp.getParam("type");
const isEdit = LedgerApp.getParam("mode") === "edit";

let currentAmt = "0";
let oldAmount = 0;
let partyData = null;

const amountInputField = document.getElementById("amount-input-field");

// --- COMMA FORMATTING LOGIC ---
window.press = (val) => {
  if (val === "DEL") {
    currentAmt = currentAmt.length > 1 ? currentAmt.slice(0, -1) : "0";
  } else {
    if (currentAmt === "0" && val !== ".") currentAmt = val;
    else if (val === "." && currentAmt.includes(".")) return;
    else currentAmt += val;
  }
  updateDisplay();
};

function updateDisplay() {
  if (currentAmt === "0" || currentAmt === "") {
    amountInputField.value = "₹0";
    return;
  }

  // Split decimal part
  let parts = currentAmt.split(".");
  let integerPart = parts[0];
  let decimalPart = parts.length > 1 ? "." + parts[1] : "";

  // Indian Number Formatting
  let lastThree = integerPart.substring(integerPart.length - 3);
  let otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== "") {
    lastThree = "," + lastThree;
  }
  let formattedInteger =
    otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;

  amountInputField.value = `₹${formattedInteger}${decimalPart}`;
}
// ---------------------------------

function setupUI() {
  const label = document.getElementById("type-label");
  const view = document.getElementById("amount-view");
  const btn = document.getElementById("saveBtn");
  const color = type === "Got" ? "#4cd964" : "#ff5252";
  label.innerText = type === "Got" ? "You Got" : "You Gave";
  label.style.color = color;
  view.style.color = color;
  btn.style.background = color;
  btn.style.color = type === "Got" ? "#000" : "#fff";
}

document.getElementById("dateInput").valueAsDate = new Date();

async function initPage() {
  setupUI();

  if (!partyId) {
    alert("Invalid Party ID");
    window.location.href = "dashboard.html";
    return;
  }

  const pSnap = await getDoc(doc(db, "parties", partyId));
  if (pSnap.exists()) {
    partyData = pSnap.data();
    document.getElementById("party-name-display").innerText = partyData.name;
  } else {
    document.getElementById("party-name-display").innerText =
      "Unknown Customer";
  }

  if (isEdit && txId) {
    document.getElementById("page-title").innerText = "Edit Entry";
    const txSnap = await getDoc(doc(db, "transactions", txId));
    if (txSnap.exists()) {
      const data = txSnap.data();
      currentAmt = data.amount.toString();
      document.getElementById("descInput").value = data.description || "";
      document.getElementById("dateInput").value = data.date;
      oldAmount = Number(data.amount);
      updateDisplay();
    }
  }
}

document.getElementById("saveBtn").onclick = async () => {
  const btn = document.getElementById("saveBtn");
  // Remove commas before saving
  const newAmount = Number(currentAmt);
  const description = document.getElementById("descInput").value || "Entry";
  const date = document.getElementById("dateInput").value;

  if (newAmount <= 0) {
    alert("Please enter a valid amount");
    return;
  }

  btn.disabled = true;
  btn.innerText = "SAVING...";

  try {
    const partyRef = doc(db, "parties", partyId);
    const pSnap = await getDoc(partyRef);
    const currentBalance = pSnap.data().balance || 0;

    let finalCalculatedBalance = 0;

    if (isEdit) {
      const reverted =
        type === "Got"
          ? currentBalance - oldAmount
          : currentBalance + oldAmount;
      finalCalculatedBalance =
        type === "Got" ? reverted + newAmount : reverted - newAmount;

      await updateDoc(doc(db, "transactions", txId), {
        amount: newAmount,
        description,
        date,
      });
    } else {
      await addDoc(collection(db, "transactions"), {
        partyId,
        amount: newAmount,
        type,
        description,
        date,
        timestamp: serverTimestamp(),
      });
      const change = type === "Got" ? newAmount : -newAmount;
      finalCalculatedBalance = currentBalance + change;
    }

    // Update the party balance and last activity timestamp
    await updateDoc(partyRef, {
      balance: finalCalculatedBalance,
      lastUpdate: Date.now(),
    });

    window.location.href = `Transaction.html?id=${partyId}`;
  } catch (err) {
    console.error(err);
    alert("Error saving transaction");
    btn.disabled = false;
    btn.innerText = "SAVE TRANSACTION";
  }
};

onAuthStateChanged(auth, (u) => {
  if (u) {
    initPage();
  } else {
    window.location.href = "signin.html";
  }
});

// Add to the bottom of add-entry.js
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const partyId = urlParams.get('id');
    
    if (partyId) {
        window.location.href = `transaction.html?id=${partyId}`;
    } else {
        window.location.href = 'dashboard.html';
    }
};