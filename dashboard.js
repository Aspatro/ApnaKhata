import { auth, db, LedgerApp } from "./app.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let allParties = [];
const skeletonLoader = document.getElementById("skeleton-loader");
const mainContent = document.getElementById("main-content");
const modal = document.getElementById("addModal");

// Modal Controls
document.getElementById("openModalBtn").onclick = () =>
  (modal.style.display = "flex");
document.getElementById("closeModalBtn").onclick = () =>
  (modal.style.display = "none");

// Search Logic
document.getElementById("searchInput").addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase().trim();
  const filtered = allParties.filter(
    (p) =>
      p.name.toLowerCase().includes(term) ||
      (p.mobile && p.mobile.includes(term)),
  );
  render(filtered);
});

function getRelativeTimeHTML(timestamp) {
  if (!timestamp)
    return `<span style="color: var(--text-muted);">No activity</span>`;
  const lastDate = new Date(timestamp);
  const today = new Date();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const lastMidnight = new Date(
    lastDate.getFullYear(),
    lastDate.getMonth(),
    lastDate.getDate(),
  );
  const diffDays = Math.round((todayMidnight - lastMidnight) / 86400000);

  if (diffDays === 0) {
    const diffMs = today - lastDate;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffHrs < 1)
      return `<span style="color: #ffffff;">${diffMins < 1 ? "Just now" : diffMins + " mins ago"}</span>`;
    else
      return `<span style="color: #ffffff;">${diffHrs} ${diffHrs === 1 ? "hour" : "hours"} ago</span>`;
  }
  if (diffDays === 1)
    return `<span style="color: #ff453a;">Yesterday</span>`;
  return `<span style="color: #ff453a;">${diffDays} days ago</span>`;
}

function render(data) {
  const list = document.getElementById("partyList");

  // Empty State UI for New Users
  if (data.length === 0) {
    list.innerHTML = `
          <div class="empty-state">
              <div class="empty-state-icon">
                  <span class="material-symbols-outlined empty-state-icon-span">group_add</span>
              </div>
              <div class="empty-state-title">Your Ledger is Empty</div>
              <p class="empty-state-desc">Start managing your business by adding your first customer or supplier.</p>
              <div class="onboarding-guide">
                  <div class="guide-step">
                      <div class="step-num">1</div>
                      <div class="step-text">Tap the <b>+</b> button below to add a customer.</div>
                  </div>
                  <div class="guide-step">
                      <div class="step-num">2</div>
                      <div class="step-text">Enter their name and mobile number.</div>
                  </div>
                  <div class="guide-step">
                      <div class="step-num">3</div>
                      <div class="step-text">Tap on their name to add "Gave" or "Got" entries.</div>
                  </div>
              </div>
          </div>`;
    return;
  }

  const sortedData = [...data].sort(
    (a, b) => (b.lastUpdate || 0) - (a.lastUpdate || 0),
  );

  list.innerHTML = sortedData
    .map((p) => {
      const formattedBalance = Math.abs(p.balance || 0).toLocaleString(
        "en-IN",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      );

      return `
      <div class="list-item" onclick="window.location.href='transaction.html?id=${p.id}'">
          <div class="item-left">
              <div class="initial-circle">${p.name[0].toUpperCase()}</div>
              <div>
                  <p class="party-name">${p.name}</p>
                  <p class="party-mobile">${p.mobile || "No Mobile"}</p>
              </div>
          </div>
          <div class="item-right">
              <p class="balance-text" style="color:${p.balance >= 0 ? "var(--primary)" : "#ff5252"};">₹${formattedBalance}</p>
              <p class="time-text">${getRelativeTimeHTML(p.lastUpdate)}</p>
          </div>
      </div>`;
    })
    .join("");
}

async function loadDashboard() {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      document.getElementById("display-shop-name").innerText =
        userDoc.data().shopName || "My Ledger";
    }

    const parties = await LedgerApp.getParties();

    allParties = await Promise.all(
      parties.map(async (p) => {
        try {
          const q = query(
            collection(db, "transactions"),
            where("partyId", "==", p.id),
          );
          const tSnap = await getDocs(q);
          const transactions = tSnap.docs.map((d) => d.data());

          const realBalance = transactions.reduce((acc, t) => {
            return t.type === "Got"
              ? acc + Number(t.amount)
              : acc - Number(t.amount);
          }, 0);

          return { ...p, balance: realBalance };
        } catch (e) {
          return { ...p, balance: 0 };
        }
      }),
    );

    render(allParties);
  } catch (error) {
    console.error("Dashboard failed to load:", error);
  } finally {
    skeletonLoader.style.display = "none";
    mainContent.style.display = "block";
  }
}

LedgerApp.initAuth(true, (user) => {
    console.log("Authenticated as:", user.email);
    loadDashboard(); 
});


document.getElementById("addPartyForm").onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById("partyName").value;
  const mobile = document.getElementById("partyMobile").value;
  await LedgerApp.addParty(name, mobile, Date.now());
  modal.style.display = "none";
  e.target.reset();
  loadDashboard();
};

document.getElementById("logoutBtn").onclick = () => {
  if (confirm("Are you sure you want to log out?")) {
    localStorage.removeItem("ApnaKhata_session");
    LedgerApp.logOut();
  }
};

// window.history.pushState(null, null, window.location.href);

window.onpopstate = function () {
    // Show the confirmation dialog
    if (confirm("Do you want to exit ApnaKhata?")) {
        // Option A: Redirect to a neutral page or home (Reliable)
        window.location.replace("about:blank"); 
        
        // Option B: For Android devices integrated with specific wrappers
        if (navigator.app && navigator.app.exitApp) {
            navigator.app.exitApp();
        }
    } else {
        // If they click 'Cancel', push the state back so the next 'Back' 
        // click triggers this code again.
        window.history.pushState(null, null, window.location.href);
    }
};