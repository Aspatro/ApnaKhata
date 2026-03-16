import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager,
    collection, addDoc, getDocs, query, where, doc, updateDoc, increment, getDoc, orderBy, setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCgJl7CPaOaCH6CXz4cvohwRkUUP10e0tE",
    authDomain: "keepnotes-a6958.firebaseapp.com",
    projectId: "keepnotes-a6958",
    storageBucket: "keepnotes-a6958.firebasestorage.app",
    messagingSenderId: "1003163878487",
    appId: "1:1003163878487:web:ffeb3ae85a5fd4fada8f12",
    measurementId: "G-PSBQMP5ZWH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with Offline Persistence
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});


export const LedgerApp = {
    // New Auth Logic
    initAuth: (requireUser = true, callback) => {
        onAuthStateChanged(auth, (user) => {
            if (requireUser && !user) {
                window.location.href = 'signin.html';
            } else if (!requireUser && user) {
                window.location.href = 'dashboard.html';
            } else {
                if (callback) callback(user);
            }
        });
    },

    signUp: async (email, password, fullName, shopName, mobile) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), {
            fullName, shopName, mobile, email, createdAt: Date.now()
        });
        return user;
    },

    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),

    logOut: () => signOut(auth).then(() => {
        localStorage.removeItem("ApnaKhata_session");
        window.location.href = 'signin.html';
    }),

    addParty: async (name, mobile) => {
        const user = auth.currentUser;
        return await addDoc(collection(db, "parties"), {
            uid: user.uid,
            name,
            mobile,
            balance: 0,
            createdAt: Date.now()
        });
    },

    getParties: async () => {
        const user = auth.currentUser;
        const q = query(collection(db, "parties"), where("uid", "==", user.uid), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    addTransaction: async (partyId, amount, type, date, description) => {
        const numAmount = parseFloat(amount);
        const adjustment = type === 'Got' ? numAmount : -numAmount;
        await addDoc(collection(db, "transactions"), {
            partyId, amount: numAmount, type, date, description, timestamp: Date.now()
        });
        const partyRef = doc(db, "parties", partyId);
        await updateDoc(partyRef, { balance: increment(adjustment) });
    },

    getParam: (key) => new URLSearchParams(window.location.search).get(key)
};

export { auth, db };

window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log("Service Worker Registered"))
            .catch(err => console.log("SW Registration Failed", err));
    }
});