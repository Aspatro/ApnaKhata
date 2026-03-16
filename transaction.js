import { LedgerApp, db, auth } from './app.js';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const partyId = LedgerApp.getParam('id');
let currentParty = null;
let selectedTx = null;
let allTransactions = [];
let globalCalculatedBal = 0;

const skeletonLoader = document.getElementById('skeleton-loader');
const mainContent = document.getElementById('main-content');

// --- Dropdown Menu ---
document.getElementById('menuBtn').onclick = (e) => {
    e.stopPropagation();
    const m = document.getElementById('dropdownMenu');
    m.style.display = m.style.display === 'block' ? 'none' : 'block';
};
window.onclick = () => document.getElementById('dropdownMenu').style.display = 'none';

// --- Party Operations ---
document.getElementById('editPartyBtn').onclick = () => {
    document.getElementById('editName').value = currentParty.name;
    document.getElementById('editMobile').value = currentParty.mobile || "";
    document.getElementById('editModal').style.display = 'flex';
};

document.getElementById('editPartyForm').onsubmit = async (e) => {
    e.preventDefault();
    const newName = document.getElementById('editName').value;
    const newMobile = document.getElementById('editMobile').value;
    await updateDoc(doc(db, "parties", partyId), { name: newName, mobile: newMobile });
    document.getElementById('editModal').style.display = 'none';
    refreshUI();
};

document.getElementById('deletePartyBtn').onclick = async () => {
    if (confirm(`Delete ${currentParty.name} and all data?`)) {
        await deleteDoc(doc(db, "parties", partyId));
        window.location.href = 'dashboard.html';
    }
};

// --- Transaction Actions ---
window.showOptions = (txId, amount, type) => {
    selectedTx = { id: txId, amount, type };
    document.getElementById('actionSheet').style.display = 'flex';
};

document.getElementById('deleteBtnUI').onclick = async () => {
    if (!confirm("Delete entry?")) return;
    const adj = (selectedTx.type === 'Got') ? -Number(selectedTx.amount) : Number(selectedTx.amount);
    await deleteDoc(doc(db, "transactions", selectedTx.id));
    await updateDoc(doc(db, "parties", partyId), { balance: (currentParty.balance || 0) + adj });
    refreshUI();
};

document.getElementById('editBtnUI').onclick = () =>
    window.location.href = `add-entry.html?id=${partyId}&txId=${selectedTx.id}&mode=edit&type=${selectedTx.type}`;

document.getElementById('navGave').onclick = () => window.location.href = `add-entry.html?id=${partyId}&type=Gave`;
document.getElementById('navGot').onclick = () => window.location.href = `add-entry.html?id=${partyId}&type=Got`;

// --- Fetch & Update UI ---
async function refreshUI() {
    if (!partyId) return;
    try {
        const pSnap = await getDoc(doc(db, "parties", partyId));
        if (pSnap.exists()) {
            currentParty = pSnap.data();
            document.getElementById('party-name-title').innerText = currentParty.name;
        }

        const q = query(collection(db, "transactions"), where("partyId", "==", partyId), orderBy("date", "desc"), orderBy("timestamp", "desc"));
        const tSnap = await getDocs(q);
        allTransactions = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const calculatedBal = allTransactions.reduce((acc, t) => {
            return t.type === 'Got' ? acc + Number(t.amount) : acc - Number(t.amount);
        }, 0);

        globalCalculatedBal = calculatedBal;

        const balEl = document.getElementById('balance-amt');
        balEl.innerText = `₹${Math.abs(calculatedBal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        balEl.style.color = calculatedBal >= 0 ? 'var(--primary)' : '#ff5252';
        document.getElementById('balance-sub').innerText = calculatedBal >= 0 ? "You will get" : "You will give";

        if (allTransactions.length > 0) {
            const lastDate = new Date(allTransactions[0].date);
            const diff = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
            document.getElementById('due-status-container').innerHTML = `<div class="due-badge"><span class="material-symbols-outlined" style="font-size:16px;">history</span> Last activity ${diff} days ago</div>`;
        }

        document.getElementById('tx-list-container').innerHTML = allTransactions.map(t => `
            <div class="tx-card" onclick="showOptions('${t.id}', ${t.amount}, '${t.type}')">
                <div><p class="tx-date">${t.date}</p><p class="tx-desc">${t.description || 'Entry'}</p></div>
                <p class="tx-amount" style="color: ${t.type === 'Got' ? 'var(--primary)' : '#ff5252'};">${t.type === 'Got' ? '+' : '-'} ₹${Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>`).join('');
    } catch (error) {
        console.error("Failed to load transactions:", error);
    } finally {
        skeletonLoader.style.display = 'none';
        mainContent.style.display = 'block';
    }
}

// --- Reminder & Reports ---
document.getElementById('whatsappReminder').onclick = async () => {
    if (!currentParty || !currentParty.mobile) {
        alert("Please add a mobile number first.");
        return;
    }
    const user = auth.currentUser;
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const shopData = userSnap.data() || { shopName: "My Ledger", mobile: "N/A" };
    const phone = currentParty.mobile.replace(/\D/g, '');
    const balanceStr = Math.abs(globalCalculatedBal).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    let msg = globalCalculatedBal > 0
        ? `${shopData.shopName}(${shopData.mobile}) confirmed your payment of ₹${balanceStr}.`
        : `${shopData.shopName}(${shopData.mobile}) requested payment of ₹${balanceStr}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
};


document.getElementById('generateReport').onclick = async () => {
    const { jsPDF } = window.jspdf;
    const pdfDoc = new jsPDF();
    
    // 1. Fetch User/Shop Details from Firestore
    const user = auth.currentUser;
    let shopName = "My Ledger";
    let ownerName = user.displayName || "Owner";
    let ownerEmail = user.email || "";
    let ownerPhone = "";

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            shopName = userData.shopName || shopName;
            ownerPhone = userData.phone || userData.mobile || ""; 
            if(userData.fullName) ownerName = userData.fullName;
        }
    } catch (e) {
        console.error("Error fetching header details:", e);
    }

    // --- HEADER SECTION ---
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.setFontSize(22);
    pdfDoc.setTextColor(0,0,0);
    pdfDoc.text(shopName.toUpperCase(), 14, 22);

    pdfDoc.setFontSize(10);
    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.setTextColor(80, 80, 80);
    const pageWidth = pdfDoc.internal.pageSize.getWidth();
    const rightX = pageWidth - 14;
    
    pdfDoc.text(`${ownerName}`, rightX, 18, { align: 'right' });
    if (ownerPhone) {
        pdfDoc.text(`Mob: ${ownerPhone}`, rightX, 23, { align: 'right' });
    }
    pdfDoc.text(`${ownerEmail}`, rightX, 28, { align: 'right' });

    pdfDoc.setDrawColor(200, 200, 200);
    pdfDoc.line(14, 32, rightX, 32);

    // --- REPORT INFO ---
    pdfDoc.setFontSize(12);
    pdfDoc.setTextColor(0, 0, 0);
    
    // Line 1: Customer Name
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.text(`Customer: ${currentParty.name}`, 14, 42);
    
    // Line 2: Report Date (Left) and Final Balance (Right)
    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 48);
    
    // --- FINAL BALANCE CALCULATION WITH SIGN ---
    const absAmount = Math.abs(globalCalculatedBal);
    const formattedAmount = absAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const sign = globalCalculatedBal >= 0 ? "+" : "-";
    const balanceText = `Final Balance: ${sign} ${formattedAmount}`;                

    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.text(balanceText, rightX, 48, { align: 'right' });

    // --- TABLE SECTION ---
    const tableData = allTransactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.description || '-',
        t.type === 'Got' ? `+${t.amount}` : '',
        t.type === 'Gave' ? `-${t.amount}` : ''
    ]);

    pdfDoc.autoTable({
        startY: 55,
        head: [['Date', 'Description', 'Got (+)', 'Gave (-)']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [19, 236, 91], textColor: [255, 255, 255] },
        styles: { fontSize: 10 },
        // This ensures the header repeats on new pages
        didDrawPage: function (data) {
            // This hook can be used for page-specific headers if needed
        }
    });

    // --- FOOTER BRANDING FOR EVERY PAGE ---
    // --- FOOTER BRANDING FOR EVERY PAGE ---
const pageCount = pdfDoc.internal.getNumberOfPages();
const pageHeight = pdfDoc.internal.pageSize.getHeight();

for (let i = 1; i <= pageCount; i++) {
    pdfDoc.setPage(i);
    pdfDoc.setFontSize(10);
    pdfDoc.setFont("helvetica", "normal"); 

    const part1 = "Mera Business, Mera ";
    const part2 = "ApnaKhata.";
    const totalWidth = pdfDoc.getTextWidth(part1 + part2);
    let startX = (pageWidth - totalWidth) / 2;

    // Draw part 1 (grey)
    pdfDoc.setTextColor(150,150,150);
    pdfDoc.text(part1, startX, pageHeight - 10);
    
    // Draw part 2 (Green)
    startX += pdfDoc.getTextWidth(part1);
    pdfDoc.setTextColor(19, 236, 91);
    pdfDoc.text(part2, startX, pageHeight - 10);
}

    // Download the PDF
    pdfDoc.save(`${currentParty.name}_Report.pdf`);
}
onAuthStateChanged(auth, (u) => u ? refreshUI() : window.location.href = 'signin.html');

// Add to the bottom of transaction.js
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
    window.location.href = 'dashboard.html';
};