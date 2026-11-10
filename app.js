// app.js - Training Tracker Atletica & Velocità
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc,
  getDoc,
  deleteDoc, 
  doc, 
  getDocs,
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import { COACH_INITIAL_WORKOUTS } from "./coachSeed.js";

// --- 1. CONFIGURAZIONE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCcbESnxYIjeEVOGVV02DaoLiNE0nnV13U",
  authDomain: "trainingtracker-8d107.firebaseapp.com",
  projectId: "trainingtracker-8d107",
  storageBucket: "trainingtracker-8d107.firebasestorage.app",
  messagingSenderId: "1000187408413",
  appId: "1:1000187408413:web:dcb996e3caa5b8f174d6f4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- 2. DEFINIZIONE CATEGORIE ATLETICA & COLORI (VIVIDI & AD ALTO CONTRASTO) ---
export const CATEGORIES = {
  velocita: {
    id: "velocita",
    label: "Velocità",
    accent: "#FACC15",
    bg: "#FEF08A",
    border: "#EAB308",
    color: "#713F12",
    icon: "⚡",
    coachOnly: false
  },
  accelerazioni: {
    id: "accelerazioni",
    label: "Accelerazioni",
    accent: "#EC4899",
    bg: "#FCE7F3",
    border: "#DB2777",
    color: "#831843",
    icon: "🚀",
    coachOnly: false
  },
  traino: {
    id: "traino",
    label: "Traino",
    accent: "#6366F1",
    bg: "#E0E7FF",
    border: "#4F46E5",
    color: "#3730A3",
    icon: "🛷",
    coachOnly: false
  },
  ritmica: {
    id: "ritmica",
    label: "Ritmica",
    accent: "#06B6D4",
    bg: "#CFFAFE",
    border: "#0891B2",
    color: "#155E75",
    icon: "🎵",
    coachOnly: false
  },
  lattacido: {
    id: "lattacido",
    label: "Lattacido",
    accent: "#EF4444",
    bg: "#FEE2E2",
    border: "#DC2626",
    color: "#7F1D1D",
    icon: "🔥",
    coachOnly: false
  },
  soglia: {
    id: "soglia",
    label: "Soglia",
    accent: "#38BDF8",
    bg: "#E0F2FE",
    border: "#0284C7",
    color: "#0369A1",
    icon: "⏱️",
    coachOnly: false
  },
  rv: {
    id: "rv",
    label: "RV (Resistenza Veloce)",
    accent: "#F97316",
    bg: "#FFEDD5",
    border: "#EA580C",
    color: "#7C2D12",
    icon: "🏃",
    coachOnly: false
  },
  forza: {
    id: "forza",
    label: "Forza",
    accent: "#22C55E",
    bg: "#DCFCE7",
    border: "#16A34A",
    color: "#14532D",
    icon: "🏋️",
    coachOnly: false
  },
  balzi: {
    id: "balzi",
    label: "Balzi",
    accent: "#A855F7",
    bg: "#F3E8FF",
    border: "#9333EA",
    color: "#581C87",
    icon: "🦘",
    coachOnly: false
  },
  fondo_lento: {
    id: "fondo_lento",
    label: "Fondo Lento",
    accent: "#84CC16",
    bg: "#ECFCCB",
    border: "#65A30D",
    color: "#3F6212",
    icon: "👟",
    coachOnly: false
  },
  sci: {
    id: "sci",
    label: "Sci",
    accent: "#2563EB",
    bg: "#DBEAFE",
    border: "#1D4ED8",
    color: "#1E3A8A",
    icon: "⛷️",
    coachOnly: true
  },
  nuoto: {
    id: "nuoto",
    label: "Nuoto (Jolly)",
    accent: "#0D9488",
    bg: "#CCFBF1",
    border: "#0F766E",
    color: "#134E4A",
    icon: "🏊",
    coachOnly: true
  },
  riposo: {
    id: "riposo",
    label: "Riposo",
    accent: "#64748B",
    bg: "#334155",
    border: "#475569",
    color: "#F1F5F9",
    icon: "🛌",
    coachOnly: false
  }
};

// --- 3. ROSTER UTENTI: SOLO ALLENATORE, SAMUELE ADMIN & ATLETI REALI (MARCO E GIULIA RIMOSSI) ---
let registeredUsers = {
  allenatore: {
    id: "allenatore",
    name: "Allenatore",
    email: "allenatore@atletica.it",
    role: "allenatore",
    avatar: "📋",
    claimed: false,
    uid: null
  },
  samuele_admin: {
    id: "samuele_admin",
    name: "Samuele Mariani",
    email: "samuele@trainingtracker.it",
    role: "admin",
    avatar: "👑"
  }
};

// Stato configurazione Allenatore unico
let coachInfo = {
  claimed: false,
  uid: null,
  email: null,
  name: null
};

// --- 4. STATO APPLICAZIONE ---
let currentUser = null;
let appRole = "ospite"; // 'admin' | 'allenatore' | 'atleta' | 'ospite'
let activeAthleteId = "allenatore"; // profilo attualmente selezionato per la visualizzazione
let viewMode = "single"; // 'single' (scheda singolo atleta) | 'all' (tutta la squadra)
let allWorkouts = [];
let selectedCategoriesForNewWorkout = new Set();
let currentCalendarMonth = new Date(2026, 10, 1); // Novembre 2026 (dove partono i dati Excel)
let unsubscribeFirestore = null;
let editingWorkoutId = null; // ID dell'allenamento attualmente in fase di modifica

// --- 5. RIFERIMENTI DOM ---
const authBox = document.getElementById("authBox");
const loginGate = document.getElementById("loginGate");
const authenticatedApp = document.getElementById("authenticatedApp");
const athleteSwitcherBar = document.getElementById("athleteSwitcherBar");
const activeAthleteName = document.getElementById("activeAthleteName");
const activeAthleteAvatar = document.getElementById("activeAthleteAvatar");
const activeAthleteRoleBadge = document.getElementById("activeAthleteRoleBadge");
const athleteSelectDropdown = document.getElementById("athleteSelectDropdown");
const btnViewSelectedAthlete = document.getElementById("btnViewSelectedAthlete");
const btnViewAllAthletes = document.getElementById("btnViewAllAthletes");
const formAthleteTarget = document.getElementById("formAthleteTarget");
const formCardTitle = document.getElementById("formCardTitle");
const formCardSubtitle = document.getElementById("formCardSubtitle");
const formCardBadge = document.getElementById("formCardBadge");
const formAuthorAvatar = document.getElementById("formAuthorAvatar");
const formAuthorName = document.getElementById("formAuthorName");
const formAuthorRoleBadge = document.getElementById("formAuthorRoleBadge");
const btnSaveWorkout = document.getElementById("btnSaveWorkout");

const noticeBanner = document.getElementById("noticeBanner");
const navTabs = document.querySelectorAll(".nav-tab");
const tabPanes = document.querySelectorAll(".tab-pane");
const tabCountBadge = document.getElementById("tabCountBadge");

// Tab Calendario
const calendarMonthTitle = document.getElementById("calendarMonthTitle");
const calendarAthleteSubtitle = document.getElementById("calendarAthleteSubtitle");
const calendarGrid = document.getElementById("calendarGrid");
const btnPrevMonth = document.getElementById("btnPrevMonth");
const btnNextMonth = document.getElementById("btnNextMonth");
const btnTodayMonth = document.getElementById("btnTodayMonth");
const calStatTotal = document.getElementById("calStatTotal");
const calStatTopCategory = document.getElementById("calStatTopCategory");
const categoryBreakdownBars = document.getElementById("categoryBreakdownBars");
const breakdownMonthLabel = document.getElementById("breakdownMonthLabel");
const legendChipsContainer = document.getElementById("legendChipsContainer");

// Tab Diario
const workoutsHistoryList = document.getElementById("workoutsHistoryList");
const searchInput = document.getElementById("searchInput");
const btnClearSearch = document.getElementById("btnClearSearch");
const filterCategory = document.getElementById("filterCategory");
const sortOrder = document.getElementById("sortOrder");
const workoutsFilteredCount = document.getElementById("workoutsFilteredCount");

// Tab Form
const workoutForm = document.getElementById("workoutForm");
const workoutDate = document.getElementById("workoutDate");
const workoutTitle = document.getElementById("workoutTitle");
const workoutSpecifiche = document.getElementById("workoutSpecifiche");
const workoutTempiCarichi = document.getElementById("workoutTempiCarichi");
const workoutNotes = document.getElementById("workoutNotes");
const categoryChipsPicker = document.getElementById("categoryChipsPicker");
const selectedCategoriesNotice = document.getElementById("selectedCategoriesNotice");
const btnResetForm = document.getElementById("btnResetForm");

// Tab Squadra
const teamRosterGrid = document.getElementById("teamRosterGrid");
const teamComparisonTbody = document.getElementById("teamComparisonTbody");
const btnSyncExcelData = document.getElementById("btnSyncExcelData");
const coachClaimBox = document.getElementById("coachClaimBox");
const coachStatusBadge = document.getElementById("coachStatusBadge");
const coachStatusDescription = document.getElementById("coachStatusDescription");

// Modali & Gate
const btnGateGoogleLogin = document.getElementById("btnGateGoogleLogin");
const btnGateEmailLogin = document.getElementById("btnGateEmailLogin");
const authModal = document.getElementById("authModal");
const btnOpenAuthModal = document.getElementById("btnOpenAuthModal");
const btnCloseAuthModal = document.getElementById("btnCloseAuthModal");
const tabBtnLogin = document.getElementById("tabBtnLogin");
const tabBtnRegister = document.getElementById("tabBtnRegister");
const emailAuthForm = document.getElementById("emailAuthForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authDisplayName = document.getElementById("authDisplayName");
const groupRegisterName = document.getElementById("groupRegisterName");
const btnSubmitEmailAuth = document.getElementById("btnSubmitEmailAuth");
const btnModalGoogleLogin = document.getElementById("btnModalGoogleLogin");
const authErrorMsg = document.getElementById("authErrorMsg");

const dayDetailModal = document.getElementById("dayDetailModal");
const btnCloseDayModal = document.getElementById("btnCloseDayModal");
const dayModalTitle = document.getElementById("dayModalTitle");
const dayModalBody = document.getElementById("dayModalBody");
const btnDayModalAddWorkout = document.getElementById("btnDayModalAddWorkout");

// Toast
const toast = document.getElementById("toast");

// --- 6. INIZIALIZZAZIONE ---
document.addEventListener("DOMContentLoaded", () => {
  workoutDate.valueAsDate = new Date();

  loadLocalState();
  renderCategoryChips();
  renderLegendChips();
  setupNavigationTabs();
  setupEventListeners();
  updateAthleteDropdowns();
  updateAthleteSwitcherUI();
  updateCoachStatusUI();
  refreshActiveViews();

  setupAuthListener();
  listenToFirestore();
  listenToCoachConfig();
  listenToUsers();
});

// --- 7. CARICAMENTO E PERSISTENZA STATO LOCALE ---
function loadLocalState() {
  const cachedWorkouts = localStorage.getItem("tt_workouts");
  if (cachedWorkouts) {
    try {
      allWorkouts = JSON.parse(cachedWorkouts);
    } catch (e) {
      allWorkouts = [];
    }
  }

  // Se vuoto, carica il piano coach originale da Excel!
  if (!allWorkouts || allWorkouts.length === 0) {
    allWorkouts = [...COACH_INITIAL_WORKOUTS];
    saveLocalWorkoutsCache();
  }

  const cachedUsers = localStorage.getItem("tt_registered_users");
  if (cachedUsers) {
    try {
      const parsed = JSON.parse(cachedUsers);
      registeredUsers = { ...registeredUsers, ...parsed };

      // Deduplica automatica per Samuele e Coach da cache locale
      Object.keys(registeredUsers).forEach(key => {
        const u = registeredUsers[key];
        if (!u) return;

        const isSamueleDuplicate = (key !== "samuele_admin") && (
          (u.email && u.email.toLowerCase().includes("samuele")) ||
          (u.name && u.name.toLowerCase().includes("samuele"))
        );

        if (isSamueleDuplicate) {
          registeredUsers.samuele_admin.uid = key;
          if (u.name) registeredUsers.samuele_admin.name = u.name;
          if (u.email) registeredUsers.samuele_admin.email = u.email;
          delete registeredUsers[key];
        }

        const isCoachDuplicate = (key !== "allenatore") && (
          (coachInfo && coachInfo.uid && key === coachInfo.uid) ||
          (u.role === "allenatore" && u.email && u.email.includes("allenatore"))
        );

        if (isCoachDuplicate) {
          registeredUsers.allenatore.uid = key;
          if (u.name) registeredUsers.allenatore.name = u.name;
          delete registeredUsers[key];
        }
      });

      saveLocalUsers();
    } catch (e) {}
  }

  const cachedCoach = localStorage.getItem("tt_coach_config");
  if (cachedCoach) {
    try {
      coachInfo = JSON.parse(cachedCoach);
    } catch (e) {}
  }
}

function saveLocalWorkoutsCache() {
  localStorage.setItem("tt_workouts", JSON.stringify(allWorkouts));
}

function saveLocalUsers() {
  localStorage.setItem("tt_registered_users", JSON.stringify(registeredUsers));
}

function saveLocalCoachConfig() {
  localStorage.setItem("tt_coach_config", JSON.stringify(coachInfo));
}

// --- 8. GESTIONE UNICO ALLENATORE (FIRST COME FIRST SERVED) ---
async function listenToCoachConfig() {
  try {
    const coachDocRef = doc(db, "config", "coach");
    onSnapshot(coachDocRef, (snap) => {
      if (snap.exists()) {
        coachInfo = snap.data();
        saveLocalCoachConfig();
        applyCoachAssignment();
      }
    });
  } catch (e) {
    console.warn("Ascolto config coach:", e);
  }
}

// --- 8B. GESTIONE CENTRALIZZATA UTENTI SU FIRESTORE ---
async function listenToUsers() {
  try {
    const usersCol = collection(db, "users");
    onSnapshot(usersCol, (snapshot) => {
      snapshot.forEach((docSnap) => {
        const u = docSnap.data();
        const docId = docSnap.id;
        const uid = u.uid || docId;
        const emailLower = (u.email || "").toLowerCase();
        const nameLower = (u.name || "").toLowerCase();

        const isCoach = (coachInfo && coachInfo.claimed && (coachInfo.uid === uid || coachInfo.uid === docId)) ||
                        (coachInfo && coachInfo.email && coachInfo.email.toLowerCase() === emailLower);

        const isSamuele = (uid === "49ZMItWVONQWoesgqCiAkJLSziE3") ||
                          emailLower === "samuele.mariani99@gmail.com" ||
                          emailLower === "samuele@trainingtracker.it" ||
                          emailLower === "admin@trainingtracker.it" ||
                          (emailLower.includes("samuele") && emailLower.includes("mariani"));

        if (isCoach) {
          registeredUsers.allenatore = {
            id: "allenatore",
            uid: uid,
            name: u.name || "Allenatore",
            email: u.email || "allenatore@atletica.it",
            role: "allenatore",
            avatar: "📋",
            claimed: true
          };
          if (docId !== "allenatore") delete registeredUsers[docId];
          if (uid !== "allenatore") delete registeredUsers[uid];
        } else if (isSamuele) {
          registeredUsers.samuele_admin = {
            id: "samuele_admin",
            uid: uid,
            name: u.name || "Samuele Mariani",
            email: u.email || "samuele@trainingtracker.it",
            role: "admin",
            avatar: "👑"
          };
          if (docId !== "samuele_admin") delete registeredUsers[docId];
          if (uid !== "samuele_admin") delete registeredUsers[uid];
        } else {
          // Atleta reale registrato (qualsiasi altro utente è RIGIDAMENTE atleta)
          registeredUsers[uid] = {
            id: uid,
            uid: uid,
            name: u.name || (u.email ? u.email.split("@")[0] : "Atleta"),
            email: u.email || "",
            role: "atleta",
            avatar: "🏃"
          };
        }
      });

      // Estrai atleti da allenamenti storici nel database se non ancora presenti
      extractUsersFromWorkouts();

      saveLocalUsers();
      updateAthleteDropdowns();
      updateAthleteSwitcherUI();
      renderTeamOverview();
    }, (error) => {
      console.warn("Ascolto utenti Firestore:", error);
    });
  } catch (err) {
    console.warn("Errore listenToUsers:", err);
  }
}

async function syncUserToFirestore(user, explicitRole = null) {
  if (!user || !user.uid) return;
  try {
    const emailLower = (user.email || "").toLowerCase();
    const uid = user.uid;

    const isSamuele = (uid === "49ZMItWVONQWoesgqCiAkJLSziE3") ||
                      emailLower === "samuele.mariani99@gmail.com" ||
                      emailLower === "samuele@trainingtracker.it" ||
                      emailLower === "admin@trainingtracker.it" ||
                      (emailLower.includes("samuele") && emailLower.includes("mariani"));

    const isCoach = (coachInfo && coachInfo.claimed && (coachInfo.uid === uid || (coachInfo.email && coachInfo.email.toLowerCase() === emailLower)));

    let effectiveRole = "atleta";
    if (isSamuele) {
      effectiveRole = "admin";
    } else if (isCoach) {
      effectiveRole = "allenatore";
    }

    const userDocRef = doc(db, "users", user.uid);
    const displayName = user.displayName || user.email.split("@")[0];
    const userData = {
      uid: user.uid,
      name: displayName,
      email: user.email,
      role: effectiveRole,
      avatar: effectiveRole === "admin" ? "👑" : (effectiveRole === "allenatore" ? "📋" : "🏃"),
      lastSeen: serverTimestamp()
    };
    await setDoc(userDocRef, userData, { merge: true });
  } catch (e) {
    console.warn("Errore syncUserToFirestore:", e);
  }
}

function extractUsersFromWorkouts() {
  if (!allWorkouts || allWorkouts.length === 0) return;
  const coachUid = coachInfo && coachInfo.uid;
  const samueleUid = registeredUsers.samuele_admin && registeredUsers.samuele_admin.uid;

  allWorkouts.forEach(w => {
    if (!w.userId) return;
    const isCoach = (w.userId === "allenatore") || (coachUid && w.userId === coachUid);
    const isSamuele = (w.userId === "samuele_admin") ||
                      (samueleUid && w.userId === samueleUid) ||
                      (w.userEmail && w.userEmail.toLowerCase().includes("samuele"));

    if (!isCoach && !isSamuele && !registeredUsers[w.userId]) {
      const athleteName = w.userName || "Atleta";
      registeredUsers[w.userId] = {
        id: w.userId,
        uid: w.userId,
        name: athleteName,
        email: w.userEmail || "",
        role: "atleta",
        avatar: "🏃"
      };

      try {
        setDoc(doc(db, "users", w.userId), {
          uid: w.userId,
          name: athleteName,
          email: w.userEmail || "",
          role: "atleta",
          avatar: "🏃",
          lastSeen: serverTimestamp()
        }, { merge: true }).catch(() => {});
      } catch (err) {}
    }
  });
}

function applyCoachAssignment() {
  if (coachInfo && coachInfo.claimed) {
    registeredUsers.allenatore = {
      id: "allenatore",
      name: coachInfo.name || "Allenatore Ufficiale",
      email: coachInfo.email,
      role: "allenatore",
      avatar: "📋",
      claimed: true,
      uid: coachInfo.uid
    };

    // Se l'utente correntemente loggato è l'allenatore
    if (currentUser && currentUser.uid === coachInfo.uid) {
      appRole = "allenatore";
    }

  }
  updateCoachStatusUI();
  updateAthleteDropdowns();
  updateAthleteSwitcherUI();
}

async function claimCoachSlot(user, chosenName = null) {
  if (coachInfo && coachInfo.claimed && coachInfo.uid !== user.uid) {
    showToast("Il ruolo di Allenatore è già stato assegnato a un altro account!", "error");
    return false;
  }

  coachInfo = {
    claimed: true,
    uid: user.uid,
    email: user.email,
    name: chosenName || user.displayName || user.email.split("@")[0],
    claimedAt: new Date().toISOString()
  };

  saveLocalCoachConfig();

  // Salva su Firestore per tutti i client
  try {
    await setDoc(doc(db, "config", "coach"), coachInfo, { merge: true });
  } catch (err) {
    console.warn("Salvataggio config coach su Firestore:", err);
  }

  // Associa i 25 allenamenti di Excel al coach
  allWorkouts.forEach(w => {
    if (w.userId === "allenatore" || w.userEmail === "allenatore@atletica.it") {
      w.userId = user.uid;
      w.userEmail = user.email;
      w.userName = coachInfo.name;
    }
  });
  saveLocalWorkoutsCache();

  appRole = "allenatore";
  activeAthleteId = user.uid;
  applyCoachAssignment();
  refreshActiveViews();
  showToast(`Benvenuto Coach! Ti sono stati assegnati i tuoi allenamenti da Excel ⚡`, "success");
  return true;
}

function updateCoachStatusUI() {
  if (!coachClaimBox || !coachStatusBadge) return;

  if (coachInfo && coachInfo.claimed) {
    coachStatusBadge.textContent = "Allenatore Assegnato";
    coachStatusBadge.className = "badge badge-accent";
    coachClaimBox.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div>
          <strong style="color: #38bdf8; font-size: 1rem;">📋 ${escapeHtml(coachInfo.name)}</strong>
          <span style="color: #94a3b8; font-size: 0.82rem; margin-left: 8px;">(${escapeHtml(coachInfo.email)})</span>
          <div style="color: #64748b; font-size: 0.75rem; margin-top: 3px;">Titolare unico del piano allenamenti Excel, delle categorie Sci e Nuoto Jolly.</div>
        </div>
        ${appRole === 'admin' ? '<button id="btnResetCoachSlot" class="btn btn-secondary btn-sm">Resetta Slot Coach</button>' : ''}
      </div>
    `;

    const btnReset = document.getElementById("btnResetCoachSlot");
    if (btnReset) {
      btnReset.addEventListener("click", async () => {
        if (confirm("Vuoi liberare lo slot di Allenatore per riassegnarlo?")) {
          coachInfo = { claimed: false, uid: null, email: null, name: null };
          saveLocalCoachConfig();
          try {
            await setDoc(doc(db, "config", "coach"), coachInfo);
          } catch(e){}
          applyCoachAssignment();
          showToast("Slot Allenatore liberato!", "success");
        }
      });
    }
  } else {
    coachStatusBadge.textContent = "In attesa del Coach";
    coachStatusBadge.className = "badge";
    coachClaimBox.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <span style="color: #f59e0b; font-size: 0.85rem;">🟡 Nessun account collegato all'Allenatore ancora.</span>
        ${currentUser ? '<button id="btnClaimCoachSelf" class="btn btn-primary btn-sm">🎯 Sono io l\'Allenatore (Reclama Slot)</button>' : '<span class="text-xs text-muted">Fai accedere il tuo coach per primo.</span>'}
      </div>
    `;

    const btnClaim = document.getElementById("btnClaimCoachSelf");
    if (btnClaim) {
      btnClaim.addEventListener("click", () => {
        claimCoachSlot(currentUser);
      });
    }
  }
}

// --- 9. SINCRONIZZAZIONE FIRESTORE ---
async function listenToFirestore() {
  try {
    const workoutsCol = collection(db, "workouts");
    const q = query(workoutsCol, orderBy("date", "desc"));

    unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const firestoreList = [];
        snapshot.forEach((docSnap) => {
          firestoreList.push({ id: docSnap.id, ...docSnap.data() });
        });
        allWorkouts = firestoreList;
        saveLocalWorkoutsCache();
        extractUsersFromWorkouts();
      } else {
        seedCoachWorkoutsToFirestore(false);
      }
      refreshActiveViews();
    }, (error) => {
      console.warn("Firestore listener fallback cache locale:", error);
      refreshActiveViews();
    });
  } catch (err) {
    console.warn("Errore connessione Firestore:", err);
    refreshActiveViews();
  }
}

async function seedCoachWorkoutsToFirestore(notifyUser = true) {
  try {
    let count = 0;
    const coachTargetUid = (coachInfo && coachInfo.uid) ? coachInfo.uid : "allenatore";
    const coachTargetEmail = (coachInfo && coachInfo.email) ? coachInfo.email : "allenatore@atletica.it";
    const coachTargetName = (coachInfo && coachInfo.name) ? coachInfo.name : "Allenatore";

    for (const w of COACH_INITIAL_WORKOUTS) {
      const docRef = doc(db, "workouts", w.id);
      await setDoc(docRef, {
        userId: coachTargetUid,
        userName: coachTargetName,
        userEmail: coachTargetEmail,
        date: w.date,
        categories: w.categories,
        title: w.title,
        specifiche: w.specifiche,
        tempiCarichi: w.tempiCarichi,
        notes: w.notes,
        createdAt: serverTimestamp()
      }, { merge: true });
      count++;
    }
    if (notifyUser) {
      showToast(`Sincronizzati ${count} allenamenti dell'allenatore da Excel!`, "success");
    }
  } catch (error) {
    console.error("Seed su Firestore:", error);
    if (notifyUser) {
      showToast("Dati ripristinati nella cache locale!", "success");
    }
  }
}

// --- 10. GESTIONE AUTENTICAZIONE ---
function setupAuthListener() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      // Determinazione ruolo rigorosa: SOLO Samuele è Admin, SOLO Coach registrato è Allenatore
      const emailLower = (user.email || "").toLowerCase();
      
      const isSamuele = (user.uid === "49ZMItWVONQWoesgqCiAkJLSziE3") ||
                        emailLower === "samuele.mariani99@gmail.com" ||
                        emailLower === "samuele@trainingtracker.it" ||
                        emailLower === "admin@trainingtracker.it" ||
                        (emailLower.includes("samuele") && emailLower.includes("mariani"));

      const isCoach = (coachInfo && coachInfo.claimed && (coachInfo.uid === user.uid || (coachInfo.email && coachInfo.email.toLowerCase() === emailLower)));

      if (isSamuele) {
        appRole = "admin";
        activeAthleteId = "samuele_admin";
        registeredUsers.samuele_admin.uid = user.uid;
        registeredUsers.samuele_admin.name = user.displayName || "Samuele Mariani";
        registeredUsers.samuele_admin.email = user.email;
        delete registeredUsers[user.uid];
        saveLocalUsers();
      } else if (isCoach) {
        appRole = "allenatore";
        activeAthleteId = "allenatore";
        registeredUsers.allenatore.uid = user.uid;
        registeredUsers.allenatore.name = user.displayName || coachInfo.name || "Allenatore";
        registeredUsers.allenatore.email = user.email;
        delete registeredUsers[user.uid];
        saveLocalUsers();
      } else {
        appRole = "atleta";
        activeAthleteId = user.uid;
        if (!registeredUsers[user.uid]) {
          registeredUsers[user.uid] = {
            id: user.uid,
            uid: user.uid,
            name: user.displayName || user.email.split("@")[0],
            email: user.email,
            role: "atleta",
            avatar: "🏃"
          };
          saveLocalUsers();
        }
      }

      // Mostra l'applicazione completa
      loginGate.classList.add("hidden");
      authenticatedApp.classList.remove("hidden");
      athleteSwitcherBar.classList.remove("hidden");

      renderAuthUI(user);
      syncUserToFirestore(user, appRole);
      updateAthleteDropdowns();
      updateAthleteSwitcherUI();
      renderCategoryChips();
      refreshActiveViews();
      updateCoachStatusUI();
      showToast(`Benvenuto, ${user.displayName || user.email}!`, "success");
    } else {
      // Non autenticato: nessun dato visibile, mostra solo la schermata di login pulita
      appRole = "ospite";
      currentUser = null;
      loginGate.classList.remove("hidden");
      authenticatedApp.classList.add("hidden");
      athleteSwitcherBar.classList.add("hidden");

      renderAuthUI(null);
    }
  });
}

function renderAuthUI(user) {
  authBox.innerHTML = "";
  if (user) {
    const profile = document.createElement("div");
    profile.className = "user-profile";
    const avatarSrc = user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`;
    
    // Check if user signed in with email/password (show Change Password button)
    const isEmailUser = user.providerData && user.providerData.some(p => p.providerId === "password");
    const changePwBtn = isEmailUser 
      ? `<button id="btnChangePassword" class="btn btn-accent btn-sm" title="Cambia Password">🔑 Cambio PW</button>` 
      : "";

    profile.innerHTML = `
      <img src="${avatarSrc}" class="user-avatar" alt="Avatar" />
      <div class="user-meta">
        <span class="user-name">${escapeHtml(user.displayName || user.email.split("@")[0])}</span>
        <span class="user-role-tag">${appRole.toUpperCase()}</span>
      </div>
      <div class="user-actions">
        ${changePwBtn}
        <button id="btnLogout" class="btn btn-secondary btn-sm" title="Disconnettiti">Esci</button>
      </div>
    `;
    authBox.appendChild(profile);

    document.getElementById("btnLogout").addEventListener("click", async () => {
      await signOut(auth);
      showToast("Disconnessione effettuata", "success");
    });

    if (isEmailUser) {
      const btnChangePw = document.getElementById("btnChangePassword");
      if (btnChangePw) {
        btnChangePw.addEventListener("click", () => openChangePasswordModal());
      }
    }
  } else {
    const loginBtn = document.createElement("button");
    loginBtn.className = "btn btn-primary btn-sm";
    loginBtn.innerHTML = `🔑 Accedi`;
    loginBtn.addEventListener("click", () => openAuthModal());
    authBox.appendChild(loginBtn);
  }
}

// --- 11. AGGIORNAMENTO SELETTORI & SWITCHER ---
function updateAthleteDropdowns() {
  if (!athleteSelectDropdown) return;

  athleteSelectDropdown.innerHTML = "";

  // 1. Allenatore (Unico coach)
  const coachName = (coachInfo && coachInfo.name) ? coachInfo.name : (registeredUsers.allenatore && registeredUsers.allenatore.name ? registeredUsers.allenatore.name : "Allenatore");
  const coachLabel = (coachInfo && coachInfo.claimed) ? `📋 ${coachName} (Coach)` : `📋 Allenatore (Dati da Excel)`;

  // 2. Samuele (Admin & Atleta - Unico)
  const samueleUser = registeredUsers.samuele_admin || {};
  const samueleName = samueleUser.name || "Samuele Mariani";
  const samueleLabel = `👑 ${samueleName} (Admin & Atleta)`;

  const entries = [
    { id: "allenatore", label: coachLabel },
    { id: "samuele_admin", label: samueleLabel }
  ];

  const seenIds = new Set(["allenatore", "samuele_admin"]);
  if (coachInfo && coachInfo.uid) seenIds.add(coachInfo.uid);
  if (samueleUser.uid) seenIds.add(samueleUser.uid);

  // 3. Aggiungi esclusivamente atleti reali registrati aggiuntivi
  Object.values(registeredUsers).forEach(u => {
    if (!u || !u.id) return;
    const isSamuele = u.id === "samuele_admin" ||
                      (samueleUser.uid && u.id === samueleUser.uid) ||
                      (u.email && u.email.toLowerCase().includes("samuele")) ||
                      (u.name && u.name.toLowerCase().includes("samuele"));
    const isCoach = u.id === "allenatore" ||
                    (coachInfo && coachInfo.uid && u.id === coachInfo.uid) ||
                    (u.email && u.email.toLowerCase().includes("allenatore"));

    if (!isSamuele && !isCoach && !seenIds.has(u.id)) {
      seenIds.add(u.id);
      entries.push({
        id: u.id,
        label: `🏃 ${u.name} (Atleta)`
      });
    }
  });

  entries.forEach(e => {
    const opt1 = document.createElement("option");
    opt1.value = e.id;
    opt1.textContent = e.label;
    athleteSelectDropdown.appendChild(opt1);
  });

  if (activeAthleteId === (samueleUser.uid)) {
    activeAthleteId = "samuele_admin";
  }
  athleteSelectDropdown.value = activeAthleteId;
  updateFormAuthorUI();
}

// Aggiorna l'autore fisso nel form (ognuno carica solo per sé)
function updateFormAuthorUI() {
  if (!formAuthorName) return;

  if (currentUser) {
    let avatar = "🏃";
    let roleLabel = "Atleta";
    let roleClass = "atleta";
    let displayName = currentUser.displayName || currentUser.email.split("@")[0];

    const isCoach = (appRole === "allenatore" || (coachInfo && coachInfo.uid === currentUser.uid));
    const isSamuele = (appRole === "admin" || (currentUser.email && currentUser.email.toLowerCase().includes("samuele")));

    if (isCoach) {
      avatar = "📋";
      roleLabel = "Allenatore";
      roleClass = "allenatore";
      displayName = `${displayName} (Coach)`;
      if (formAthleteTarget) formAthleteTarget.value = (coachInfo && coachInfo.uid) ? coachInfo.uid : "allenatore";
    } else if (isSamuele) {
      avatar = "👑";
      roleLabel = "Admin & Atleta";
      roleClass = "admin";
      displayName = `${displayName}`;
      if (formAthleteTarget) formAthleteTarget.value = currentUser.uid;
    } else {
      if (formAthleteTarget) formAthleteTarget.value = currentUser.uid;
    }

    if (formAuthorAvatar) formAuthorAvatar.textContent = avatar;
    formAuthorName.textContent = displayName;
    if (formAuthorRoleBadge) {
      formAuthorRoleBadge.textContent = roleLabel;
      formAuthorRoleBadge.className = `role-badge ${roleClass}`;
    }
  } else {
    if (formAuthorAvatar) formAuthorAvatar.textContent = "🔒";
    formAuthorName.textContent = "Accedi per caricare o modificare i tuoi allenamenti";
    if (formAuthorRoleBadge) {
      formAuthorRoleBadge.textContent = "Non loggato";
      formAuthorRoleBadge.className = "role-badge";
    }
    if (formAthleteTarget) formAthleteTarget.value = "";
  }
}

function updateAthleteSwitcherUI() {
  let currentAthlete = registeredUsers[activeAthleteId];
  if (!currentAthlete) {
    if (activeAthleteId === (coachInfo && coachInfo.uid)) {
      currentAthlete = registeredUsers.allenatore;
    } else {
      currentAthlete = { name: "Atleta", role: "atleta", avatar: "🏃" };
    }
  }

  activeAthleteName.textContent = currentAthlete.name;
  activeAthleteAvatar.textContent = currentAthlete.avatar || "🏃";
  activeAthleteRoleBadge.textContent = currentAthlete.role;
  activeAthleteRoleBadge.className = `role-badge ${currentAthlete.role}`;

  if (calendarAthleteSubtitle) {
    calendarAthleteSubtitle.textContent = viewMode === "all" ? "Visuale: Tutta la Squadra" : `Scheda di: ${currentAthlete.name}`;
  }

  btnViewSelectedAthlete.classList.toggle("active", viewMode === "single");
  btnViewAllAthletes.classList.toggle("active", viewMode === "all");
}

function setActiveAthlete(athleteId) {
  activeAthleteId = athleteId;
  viewMode = "single";
  updateAthleteSwitcherUI();
  renderCategoryChips();
  refreshActiveViews();
}

// --- 12. GESTIONE TAB NAVIGAZIONE ---
function setupNavigationTabs() {
  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetTab = tab.getAttribute("data-tab");
      navTabs.forEach(t => t.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const targetPane = document.getElementById(targetTab);
      if (targetPane) {
        targetPane.classList.add("active");
      }

      if (targetTab === "tabCalendar") renderCalendar();
      if (targetTab === "tabLog") renderWorkoutsFeed();
      if (targetTab === "tabTeam") renderTeamOverview();
    });
  });
}

function refreshActiveViews() {
  renderCalendar();
  renderWorkoutsFeed();
  renderTeamOverview();
  updateWorkoutsBadgeCount();
}

function updateWorkoutsBadgeCount() {
  const filtered = getVisibleWorkouts();
  if (tabCountBadge) {
    tabCountBadge.textContent = filtered.length;
  }
}

// Filtra allenamenti in base al profilo selezionato o tutta la squadra
function getVisibleWorkouts() {
  if (viewMode === "all") {
    return allWorkouts;
  }
  return allWorkouts.filter(w => {
    if (activeAthleteId === "allenatore" || (coachInfo && coachInfo.uid && activeAthleteId === coachInfo.uid)) {
      return w.userId === "allenatore" || (coachInfo && w.userId === coachInfo.uid) || (w.userEmail && w.userEmail.includes("allenatore"));
    }
    if (activeAthleteId === "samuele_admin") {
      const samUid = registeredUsers.samuele_admin && registeredUsers.samuele_admin.uid;
      return w.userId === "samuele_admin" || (samUid && w.userId === samUid) || (w.userEmail && w.userEmail.toLowerCase().includes("samuele"));
    }
    return w.userId === activeAthleteId;
  });
}

// --- 13. TAB 1: PANORAMICA MENSILE (CALENDARIO) ---
function renderCalendar() {
  if (!calendarGrid) return;
  calendarGrid.innerHTML = "";

  const year = currentCalendarMonth.getFullYear();
  const month = currentCalendarMonth.getMonth();

  const monthNames = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];
  calendarMonthTitle.textContent = `${monthNames[month]} ${year}`;
  breakdownMonthLabel.textContent = `${monthNames[month]} ${year}`;

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const totalDaysInMonth = lastDayOfMonth.getDate();

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const cell = createCalendarCell(dayNum, true, new Date(year, month - 1, dayNum));
    calendarGrid.appendChild(cell);
  }

  const today = new Date();
  const visibleWorkouts = getVisibleWorkouts();

  const workoutsByDate = {};
  visibleWorkouts.forEach(w => {
    if (!workoutsByDate[w.date]) workoutsByDate[w.date] = [];
    workoutsByDate[w.date].push(w);
  });

  let monthlyWorkoutsCount = 0;
  const categoryCounter = {};

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dateStr = formatDateToISO(currentDate);
    const dayWorkouts = workoutsByDate[dateStr] || [];

    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    const cell = createCalendarCell(day, false, currentDate, isToday, dayWorkouts);
    calendarGrid.appendChild(cell);

    if (dayWorkouts.length > 0) {
      monthlyWorkoutsCount += dayWorkouts.length;
      dayWorkouts.forEach(w => {
        (w.categories || []).forEach(catId => {
          categoryCounter[catId] = (categoryCounter[catId] || 0) + 1;
        });
      });
    }
  }

  const totalCellsSoFar = startingDayOfWeek + totalDaysInMonth;
  const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const cell = createCalendarCell(i, true, new Date(year, month + 1, i));
    calendarGrid.appendChild(cell);
  }

  calStatTotal.textContent = monthlyWorkoutsCount;

  let topCatId = "-";
  let maxCount = 0;
  for (const [cat, count] of Object.entries(categoryCounter)) {
    if (count > maxCount) {
      maxCount = count;
      topCatId = cat;
    }
  }
  const topCatObj = CATEGORIES[topCatId];
  calStatTopCategory.textContent = topCatObj ? `${topCatObj.icon} ${topCatObj.label}` : "Nessuna";

  renderMonthlyBreakdownBars(categoryCounter, monthlyWorkoutsCount);
}

function createCalendarCell(dayNumber, isOtherMonth, cellDate, isToday = false, dayWorkouts = []) {
  const cell = document.createElement("div");
  cell.className = `calendar-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;

  const topRow = document.createElement("div");
  topRow.className = "cell-top";
  topRow.innerHTML = `<span class="day-number">${dayNumber}</span>`;
  cell.appendChild(topRow);

  const workoutsContainer = document.createElement("div");
  workoutsContainer.className = "day-workouts-container";

  if (dayWorkouts.length > 0) {
    dayWorkouts.forEach(w => {
      const cats = w.categories && w.categories.length > 0 ? w.categories : ["velocita"];
      cats.forEach(catId => {
        const catObj = CATEGORIES[catId] || { label: catId, bg: "#334155", color: "#fff", icon: "⚡" };
        const pill = document.createElement("div");
        pill.className = "cal-workout-pill";
        pill.style.backgroundColor = catObj.bg;
        pill.style.color = catObj.color;
        pill.style.borderLeftColor = catObj.accent || catObj.border || catObj.color;
        pill.style.setProperty("--pill-accent", catObj.accent || catObj.border || catObj.color);
        pill.innerHTML = `<span class="pill-icon">${catObj.icon}</span> <span class="pill-text">${catObj.label}</span>`;
        workoutsContainer.appendChild(pill);
      });

      if (w.specifiche) {
        const drillPreview = document.createElement("div");
        drillPreview.className = "cal-workout-drill";
        drillPreview.textContent = w.specifiche;
        drillPreview.title = `${w.specifiche} ${w.tempiCarichi ? ' | ' + w.tempiCarichi : ''}`;
        workoutsContainer.appendChild(drillPreview);
      }
    });

    cell.addEventListener("click", () => {
      const dateIso = formatDateToISO(cellDate);
      const squadWorkouts = allWorkouts.filter(item => item.date === dateIso);
      openDayDetailModal(cellDate, squadWorkouts.length > 0 ? squadWorkouts : dayWorkouts);
    });
  } else if (!isOtherMonth) {
    cell.addEventListener("click", () => {
      const dateIso = formatDateToISO(cellDate);
      const squadWorkouts = allWorkouts.filter(item => item.date === dateIso);
      if (squadWorkouts.length > 0) {
        openDayDetailModal(cellDate, squadWorkouts);
      } else {
        workoutDate.valueAsDate = cellDate;
        document.querySelector('[data-tab="tabNew"]').click();
      }
    });
  }

  cell.appendChild(workoutsContainer);
  return cell;
}

function renderMonthlyBreakdownBars(counter, totalWorkouts) {
  if (!categoryBreakdownBars) return;
  categoryBreakdownBars.innerHTML = "";

  const entries = Object.entries(counter).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    categoryBreakdownBars.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 20px;">
        <p class="text-dim">Nessun allenamento registrato in questo mese per il profilo selezionato.</p>
      </div>
    `;
    return;
  }

  entries.forEach(([catId, count]) => {
    const cat = CATEGORIES[catId] || { label: catId, bg: "#38bdf8", color: "#000", border: "#38bdf8", icon: "⚡" };
    const percentage = totalWorkouts > 0 ? Math.round((count / totalWorkouts) * 100) : 0;

    const item = document.createElement("div");
    item.className = "breakdown-item";
    item.innerHTML = `
      <div class="breakdown-header">
        <span class="breakdown-category-badge" style="background-color: ${cat.bg}; color: ${cat.color}; border: 1px solid ${cat.border || cat.color};">
          ${cat.icon} ${cat.label}
        </span>
        <span class="breakdown-counts">${count} sedute (${percentage}%)</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${percentage}%; background-color: ${cat.accent || cat.border || cat.color};"></div>
      </div>
    `;
    categoryBreakdownBars.appendChild(item);
  });
}

function renderLegendChips() {
  if (!legendChipsContainer) return;
  legendChipsContainer.innerHTML = "";

  Object.values(CATEGORIES).forEach(cat => {
    const chip = document.createElement("span");
    chip.className = "legend-chip";
    chip.style.backgroundColor = cat.bg;
    chip.style.color = cat.color;
    chip.style.border = `1px solid ${cat.border || cat.color}`;
    chip.innerHTML = `${cat.icon} ${cat.label} ${cat.coachOnly ? '<span class="text-xs">(Allenatore)</span>' : ''}`;
    legendChipsContainer.appendChild(chip);
  });
}

// --- 14. TAB 2: DIARIO ALLENAMENTI (FEED LISTA) ---
function renderWorkoutsFeed() {
  if (!workoutsHistoryList) return;
  workoutsHistoryList.innerHTML = "";

  let list = getVisibleWorkouts();

  const queryText = (searchInput.value || "").toLowerCase().trim();
  if (queryText) {
    list = list.filter(w => {
      const matchTitle = (w.title || "").toLowerCase().includes(queryText);
      const matchSpec = (w.specifiche || "").toLowerCase().includes(queryText);
      const matchTempi = (w.tempiCarichi || "").toLowerCase().includes(queryText);
      const matchNotes = (w.notes || "").toLowerCase().includes(queryText);
      return matchTitle || matchSpec || matchTempi || matchNotes;
    });
  }

  const catFilter = filterCategory.value;
  if (catFilter && catFilter !== "ALL") {
    list = list.filter(w => (w.categories || []).includes(catFilter));
  }

  const order = sortOrder.value;
  list.sort((a, b) => {
    return order === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
  });

  workoutsFilteredCount.textContent = `${list.length} ${list.length === 1 ? 'allenamento' : 'allenamenti'}`;

  if (list.length === 0) {
    workoutsHistoryList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">👟</span>
        <p>Nessun allenamento trovato.</p>
        <small>Modifica i filtri o premi "Registra Allenamento" per salvare una sessione.</small>
      </div>
    `;
    return;
  }

  list.forEach(w => {
    const card = createWorkoutCard(w);
    workoutsHistoryList.appendChild(card);
  });
}

// Verifica se l'allenamento appartiene all'utente correntemente autenticato
function isWorkoutOwnedByCurrentUser(w) {
  if (!currentUser) return false;

  // Match diretto su UID
  if (w.userId && w.userId === currentUser.uid) return true;

  // Match diretto su Email (case-insensitive)
  if (w.userEmail && currentUser.email && w.userEmail.toLowerCase() === currentUser.email.toLowerCase()) {
    return true;
  }

  // Proprietà Allenatore per gli allenamenti storici da Excel ("allenatore")
  const isCoach = (appRole === "allenatore") || 
                  (coachInfo && coachInfo.claimed && coachInfo.uid === currentUser.uid) ||
                  (registeredUsers[currentUser.uid] && registeredUsers[currentUser.uid].role === "allenatore");
  if (isCoach && (w.userId === "allenatore" || (w.userEmail && w.userEmail.includes("allenatore")))) {
    return true;
  }

  // Proprietà Samuele Admin per le sessioni iniziali con ID "samuele_admin"
  const isSamuele = (currentUser.email && currentUser.email.toLowerCase().includes("samuele")) ||
                    (currentUser.displayName && currentUser.displayName.toLowerCase().includes("samuele"));
  if (isSamuele && (w.userId === "samuele_admin" || (w.userEmail && w.userEmail.includes("samuele")))) {
    return true;
  }

  return false;
}

function createWorkoutCard(w) {
  const card = document.createElement("div");
  card.className = "workout-card";

  const d = new Date(w.date + "T00:00:00");
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = d.toLocaleDateString('it-IT', options);
  const weekdayShort = d.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase();

  const categoriesHtml = (w.categories || ["velocita"]).map(catId => {
    const cat = CATEGORIES[catId] || { label: catId, bg: "#38bdf8", color: "#000", border: "#38bdf8", icon: "⚡" };
    return `
      <span class="cat-badge" style="background-color: ${cat.bg}; color: ${cat.color}; border: 1px solid ${cat.border || cat.color};">
        ${cat.icon} ${cat.label}
      </span>
    `;
  }).join("");

  const athleteName = w.userName || (registeredUsers[w.userId] ? registeredUsers[w.userId].name : "Atleta");
  const canManage = isWorkoutOwnedByCurrentUser(w);

  let actionsHtml = "";
  if (canManage) {
    actionsHtml = `
      <div class="workout-actions">
        <button type="button" class="btn-action-copy" data-id="${w.id}" title="Duplica questo allenamento">📋 Duplica</button>
        <button type="button" class="btn-action-edit" data-id="${w.id}" title="Modifica questa sessione">✏️ Modifica</button>
        <button type="button" class="btn-action-del" data-id="${w.id}" title="Elimina questa sessione">🗑️ Elimina</button>
      </div>
    `;
  } else {
    actionsHtml = `
      <div class="workout-actions">
        <button type="button" class="btn-action-copy" data-id="${w.id}" title="Copia questo allenamento nel tuo diario per personalizzarlo">📋 Copia per me</button>
        <span class="text-dim text-xs" title="Puoi visualizzare questa sessione, ma solo l'autore può modificarla o eliminarla">🔒 Solo lettura</span>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="workout-card-header">
      <div class="workout-date-row">
        <span class="workout-day-badge">${weekdayShort}</span>
        <span class="workout-date-text">${formattedDate}</span>
      </div>
      <div class="workout-categories-badges">
        ${categoriesHtml}
      </div>
    </div>

    ${w.title ? `<div class="workout-title-text" style="font-weight: 700; font-size: 1rem; color: #fff;">${escapeHtml(w.title)}</div>` : ''}

    <div class="workout-details-box">
      <div class="detail-block">
        <span class="detail-label">📐 Specifiche Allenamento</span>
        <div class="detail-content">${w.specifiche ? escapeHtml(w.specifiche) : '<span class="text-dim">Non specificato</span>'}</div>
      </div>

      <div class="detail-block">
        <span class="detail-label">⏱️ Tempi / Carichi</span>
        <div class="detail-content chrono">${w.tempiCarichi ? escapeHtml(w.tempiCarichi) : '<span class="text-dim">Nessun crono registrato</span>'}</div>
      </div>
    </div>

    ${w.notes ? `<div class="workout-notes-text">💬 "${escapeHtml(w.notes)}"</div>` : ''}

    <div class="workout-card-footer">
      <span class="workout-author">👤 ${escapeHtml(athleteName)}</span>
      ${actionsHtml}
    </div>
  `;

  const copyBtn = card.querySelector(".btn-action-copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyWorkoutToCurrentUser(w);
    });
  }

  if (canManage) {
    const editBtn = card.querySelector(".btn-action-edit");
    if (editBtn) {
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        startEditWorkout(w);
      });
    }

    const delBtn = card.querySelector(".btn-action-del");
    if (delBtn) {
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteWorkout(w.id);
      });
    }
  }

  return card;
}

// Copia un allenamento (proprio o di un compagno/coach) assegnandolo all'utente loggato
async function copyWorkoutToCurrentUser(w) {
  if (!currentUser) {
    showToast("Effettua l'accesso per copiare questo allenamento nel tuo diario!", "error");
    openAuthModal();
    return;
  }

  const isCoach = (appRole === "allenatore" || (coachInfo && coachInfo.uid === currentUser.uid));
  const isSamuele = (appRole === "admin" || (currentUser.email && currentUser.email.toLowerCase().includes("samuele")));

  let authorId = currentUser.uid;
  let authorName = currentUser.displayName || currentUser.email.split("@")[0];
  let authorEmail = currentUser.email || "";

  if (isCoach) {
    authorId = (coachInfo && coachInfo.uid) ? coachInfo.uid : "allenatore";
    authorName = currentUser.displayName || "Allenatore";
    authorEmail = currentUser.email || "allenatore@atletica.it";
  } else if (isSamuele) {
    authorId = currentUser.uid;
    authorName = currentUser.displayName || "Samuele";
  }

  const newWorkout = {
    id: `workout_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: authorId,
    userName: authorName,
    userEmail: authorEmail,
    date: w.date,
    title: w.title || "",
    categories: Array.isArray(w.categories) ? [...w.categories] : ["velocita"],
    specifiche: w.specifiche || "",
    tempiCarichi: w.tempiCarichi || "",
    notes: w.notes || "",
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, "workouts", newWorkout.id);
    await setDoc(docRef, {
      ...newWorkout,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn("Salvataggio copia Firestore:", err);
  }

  allWorkouts.unshift(newWorkout);
  saveLocalWorkoutsCache();

  showToast(`Allenamento copiato nel tuo diario! 📋 Ora puoi modificarlo con ✏️.`, "success");

  // Se il modale di dettaglio giornata è aperto, aggiorniamone il contenuto subito per mostrare la nuova sessione
  if (dayDetailModal && !dayDetailModal.classList.contains("hidden")) {
    const dayDate = new Date(w.date + "T00:00:00");
    const updatedSquadWorkouts = allWorkouts.filter(item => item.date === w.date);
    openDayDetailModal(dayDate, updatedSquadWorkouts);
  }

  refreshActiveViews();
}

// Avvia la modalità di modifica di un proprio allenamento
function startEditWorkout(w) {
  if (!currentUser) {
    showToast("Devi effettuare l'accesso per modificare questo allenamento!", "error");
    openAuthModal();
    return;
  }

  if (!isWorkoutOwnedByCurrentUser(w)) {
    showToast("Puoi modificare solo i tuoi allenamenti!", "error");
    return;
  }

  if (dayDetailModal && !dayDetailModal.classList.contains("hidden")) {
    dayDetailModal.classList.add("hidden");
  }

  editingWorkoutId = w.id;

  // Passa al tab di registrazione
  const tabNewBtn = document.querySelector('[data-tab="tabNew"]');
  if (tabNewBtn) tabNewBtn.click();

  // Aggiorna interfaccia form
  if (formCardTitle) formCardTitle.textContent = "✏️ Modifica Allenamento";
  if (formCardSubtitle) formCardSubtitle.textContent = "Modifica i dati della tua sessione e clicca su Salva Modifiche.";
  if (formCardBadge) {
    formCardBadge.textContent = "Modifica Sessione";
    formCardBadge.className = "badge badge-primary";
  }
  if (btnSaveWorkout) {
    btnSaveWorkout.innerHTML = "💾 Salva Modifiche";
  }
  if (btnResetForm) {
    btnResetForm.textContent = "✕ Annulla Modifica";
  }

  // Popola campi con i dati esistenti
  workoutDate.value = w.date || "";
  workoutTitle.value = w.title || "";
  workoutSpecifiche.value = w.specifiche || "";
  workoutTempiCarichi.value = w.tempiCarichi || "";
  workoutNotes.value = w.notes || "";

  // Seleziona categorie esistenti
  selectedCategoriesForNewWorkout = new Set(w.categories || ["velocita"]);
  renderCategoryChips();
  updateCategorySelectionNotice();

  if (formCardTitle) {
    formCardTitle.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  showToast(`Modifica attiva per la sessione del ${w.date}`, "info");
}

async function deleteWorkout(workoutId) {
  if (!currentUser) {
    showToast("Devi effettuare l'accesso per eliminare un allenamento!", "error");
    openAuthModal();
    return;
  }

  const w = allWorkouts.find(item => item.id === workoutId);
  if (!w) return;

  if (!isWorkoutOwnedByCurrentUser(w)) {
    showToast("Non puoi eliminare gli allenamenti di altri atleti!", "error");
    return;
  }

  if (!confirm(`Sei sicuro di voler eliminare l'allenamento del ${w.date}?`)) return;

  try {
    const docRef = doc(db, "workouts", workoutId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Eliminazione Firestore:", err);
  }

  allWorkouts = allWorkouts.filter(item => item.id !== workoutId);
  saveLocalWorkoutsCache();
  refreshActiveViews();

  if (dayDetailModal && !dayDetailModal.classList.contains("hidden")) {
    dayDetailModal.classList.add("hidden");
  }

  showToast("Allenamento eliminato con successo", "success");
}

// --- 15. TAB 3: REGISTRA NUOVO ALLENAMENTO ---
function renderCategoryChips() {
  if (!categoryChipsPicker) return;
  categoryChipsPicker.innerHTML = "";

  const isCoachOrAdmin = (appRole === "admin" || appRole === "allenatore" || activeAthleteId === "allenatore" || (coachInfo && activeAthleteId === coachInfo.uid));

  Object.values(CATEGORIES).forEach(cat => {
    if (cat.coachOnly && !isCoachOrAdmin) {
      return;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `cat-chip-btn ${selectedCategoriesForNewWorkout.has(cat.id) ? 'active' : ''}`;
    btn.dataset.catId = cat.id;

    if (selectedCategoriesForNewWorkout.has(cat.id)) {
      btn.style.backgroundColor = cat.bg;
      btn.style.color = cat.color;
      btn.style.borderColor = cat.border || cat.color;
    }

    btn.innerHTML = `<span>${cat.icon}</span> <span>${cat.label}</span>`;

    btn.addEventListener("click", () => {
      if (selectedCategoriesForNewWorkout.has(cat.id)) {
        selectedCategoriesForNewWorkout.delete(cat.id);
        btn.classList.remove("active");
        btn.style.backgroundColor = "";
        btn.style.color = "";
        btn.style.borderColor = "";
      } else {
        selectedCategoriesForNewWorkout.add(cat.id);
        btn.classList.add("active");
        btn.style.backgroundColor = cat.bg;
        btn.style.color = cat.color;
        btn.style.borderColor = cat.border || cat.color;
      }
      updateCategorySelectionNotice();
    });

    categoryChipsPicker.appendChild(btn);
  });

  updateCategorySelectionNotice();
}

function updateCategorySelectionNotice() {
  if (!selectedCategoriesNotice) return;
  if (selectedCategoriesForNewWorkout.size === 0) {
    selectedCategoriesNotice.textContent = "⚠️ Nessuna categoria selezionata. Clicca su almeno una categoria.";
    selectedCategoriesNotice.style.color = "#f87171";
  } else {
    const names = Array.from(selectedCategoriesForNewWorkout)
      .map(id => CATEGORIES[id] ? CATEGORIES[id].label : id)
      .join(", ");
    selectedCategoriesNotice.textContent = `✓ Categorie selezionate (${selectedCategoriesForNewWorkout.size}): ${names}`;
    selectedCategoriesNotice.style.color = "#38bdf8";
  }
}

// Invio form (supporta sia inserimento di un proprio allenamento che modifica di una propria sessione)
workoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) {
    showToast("Devi effettuare l'accesso per salvare o modificare un allenamento!", "error");
    openAuthModal();
    return;
  }

  if (selectedCategoriesForNewWorkout.size === 0) {
    showToast("Seleziona almeno una categoria per l'allenamento!", "error");
    return;
  }

  // Determina l'identità dell'autore (rigorosamente l'utente autenticato)
  const isCoach = (appRole === "allenatore" || (coachInfo && coachInfo.uid === currentUser.uid));
  const isSamuele = (appRole === "admin" || (currentUser.email && currentUser.email.toLowerCase().includes("samuele")));

  let authorId = currentUser.uid;
  let authorName = currentUser.displayName || currentUser.email.split("@")[0];
  let authorEmail = currentUser.email || "";

  if (isCoach) {
    authorId = (coachInfo && coachInfo.uid) ? coachInfo.uid : "allenatore";
    authorName = currentUser.displayName || "Allenatore";
    authorEmail = currentUser.email || "allenatore@atletica.it";
  } else if (isSamuele) {
    authorId = currentUser.uid;
    authorName = currentUser.displayName || "Samuele";
  }

  if (editingWorkoutId) {
    // --- AGGIORNAMENTO DI UNA SESSIONE PROPRIA ---
    const existingIndex = allWorkouts.findIndex(w => w.id === editingWorkoutId);
    const existingWorkout = allWorkouts[existingIndex];

    if (!existingWorkout || !isWorkoutOwnedByCurrentUser(existingWorkout)) {
      showToast("Non hai i permessi per modificare questo allenamento!", "error");
      return;
    }

    const updatedWorkout = {
      ...existingWorkout,
      date: workoutDate.value,
      title: (workoutTitle.value || "").trim(),
      categories: Array.from(selectedCategoriesForNewWorkout),
      specifiche: (workoutSpecifiche.value || "").trim(),
      tempiCarichi: (workoutTempiCarichi.value || "").trim(),
      notes: (workoutNotes.value || "").trim(),
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, "workouts", editingWorkoutId);
      await setDoc(docRef, {
        ...updatedWorkout,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn("Aggiornamento Firestore:", err);
    }

    allWorkouts[existingIndex] = updatedWorkout;
    saveLocalWorkoutsCache();

    showToast("Allenamento modificato con successo! ⚡", "success");
    resetWorkoutForm();
    refreshActiveViews();

    const tabLogBtn = document.querySelector('[data-tab="tabLog"]');
    if (tabLogBtn) tabLogBtn.click();
  } else {
    // --- NUOVO ALLENAMENTO (OGNUNO CARICA ESCLUSIVAMENTE PER SÉ) ---
    const newWorkout = {
      id: `workout_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: authorId,
      userName: authorName,
      userEmail: authorEmail,
      date: workoutDate.value,
      title: (workoutTitle.value || "").trim(),
      categories: Array.from(selectedCategoriesForNewWorkout),
      specifiche: (workoutSpecifiche.value || "").trim(),
      tempiCarichi: (workoutTempiCarichi.value || "").trim(),
      notes: (workoutNotes.value || "").trim(),
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, "workouts", newWorkout.id);
      await setDoc(docRef, {
        ...newWorkout,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.warn("Salvataggio Firestore:", err);
    }

    allWorkouts.unshift(newWorkout);
    saveLocalWorkoutsCache();

    showToast("Allenamento registrato con successo! ⚡", "success");
    resetWorkoutForm();
    refreshActiveViews();
    document.querySelector('[data-tab="tabCalendar"]').click();
  }
});

function resetWorkoutForm() {
  editingWorkoutId = null;

  if (formCardTitle) formCardTitle.textContent = "Registra Nuovo Allenamento";
  if (formCardSubtitle) formCardSubtitle.textContent = "Compila data, categorie (anche multiple), specifiche e tempi.";
  if (formCardBadge) {
    formCardBadge.textContent = "Nuova Sessione";
    formCardBadge.className = "badge badge-accent";
  }
  if (btnSaveWorkout) {
    btnSaveWorkout.innerHTML = "💾 Salva Allenamento";
  }
  if (btnResetForm) {
    btnResetForm.textContent = "Annulla";
  }

  workoutForm.reset();
  workoutDate.valueAsDate = new Date();
  selectedCategoriesForNewWorkout.clear();
  renderCategoryChips();
  updateCategorySelectionNotice();
}

btnResetForm.addEventListener("click", resetWorkoutForm);

document.querySelectorAll(".btn-snippet").forEach(btn => {
  btn.addEventListener("click", () => {
    workoutSpecifiche.value = btn.getAttribute("data-snippet");
    workoutSpecifiche.focus();
  });
});

// --- 16. TAB 4: SQUADRA & STATISTICHE ---
function renderTeamOverview() {
  if (!teamRosterGrid || !teamComparisonTbody) return;

  teamRosterGrid.innerHTML = "";
  teamComparisonTbody.innerHTML = "";

  const usersList = [];
  const seenRosterIds = new Set();

  if (registeredUsers.allenatore) {
    usersList.push(registeredUsers.allenatore);
    seenRosterIds.add("allenatore");
    if (coachInfo && coachInfo.uid) seenRosterIds.add(coachInfo.uid);
  }

  if (registeredUsers.samuele_admin) {
    usersList.push(registeredUsers.samuele_admin);
    seenRosterIds.add("samuele_admin");
    if (registeredUsers.samuele_admin.uid) seenRosterIds.add(registeredUsers.samuele_admin.uid);
  }

  Object.values(registeredUsers).forEach(u => {
    if (!u || !u.id) return;
    const isSamuele = u.id === "samuele_admin" ||
                      (registeredUsers.samuele_admin && registeredUsers.samuele_admin.uid === u.id) ||
                      (u.email && u.email.toLowerCase().includes("samuele")) ||
                      (u.name && u.name.toLowerCase().includes("samuele"));
    const isCoach = u.id === "allenatore" ||
                    (coachInfo && coachInfo.uid === u.id) ||
                    (u.email && u.email.toLowerCase().includes("allenatore"));

    if (!isSamuele && !isCoach && !seenRosterIds.has(u.id)) {
      seenRosterIds.add(u.id);
      usersList.push(u);
    }
  });

  const currentMonthPrefix = formatDateToISO(currentCalendarMonth).substring(0, 7);

  usersList.forEach(u => {
    const userWorkouts = allWorkouts.filter(w => {
      if (u.id === "allenatore" || (coachInfo && coachInfo.uid && u.id === coachInfo.uid)) {
        return w.userId === "allenatore" || (coachInfo && w.userId === coachInfo.uid) || (w.userEmail && w.userEmail.includes("allenatore"));
      }
      if (u.id === "samuele_admin" || (registeredUsers.samuele_admin && registeredUsers.samuele_admin.uid && u.id === registeredUsers.samuele_admin.uid)) {
        const samUid = registeredUsers.samuele_admin && registeredUsers.samuele_admin.uid;
        return w.userId === "samuele_admin" || (samUid && w.userId === samUid) || (w.userEmail && w.userEmail.toLowerCase().includes("samuele"));
      }
      return w.userId === u.id;
    });

    const thisMonthWorkouts = userWorkouts.filter(w => w.date.startsWith(currentMonthPrefix));
    
    let lastDate = "-";
    if (userWorkouts.length > 0) {
      const sorted = [...userWorkouts].sort((a, b) => b.date.localeCompare(a.date));
      lastDate = sorted[0].date;
    }

    const card = document.createElement("div");
    card.className = `athlete-roster-card ${activeAthleteId === u.id ? 'active-selected' : ''}`;
    card.innerHTML = `
      <div class="roster-card-top">
        <span class="roster-avatar">${u.avatar || '🏃'}</span>
        <div class="roster-info">
          <h4>${escapeHtml(u.name)}</h4>
          <span class="role-badge ${u.role}">${u.role}</span>
        </div>
      </div>
      <div class="roster-stats-row">
        <span>Totali: <strong>${userWorkouts.length}</strong></span>
        <span>Questo Mese: <strong>${thisMonthWorkouts.length}</strong></span>
      </div>
      <button class="btn btn-secondary btn-sm btn-block">Visualizza Scheda</button>
    `;
    card.addEventListener("click", () => {
      setActiveAthlete(u.id);
      document.querySelector('[data-tab="tabCalendar"]').click();
    });
    teamRosterGrid.appendChild(card);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(u.name)}</strong></td>
      <td><span class="role-badge ${u.role}">${u.role}</span></td>
      <td>${userWorkouts.length}</td>
      <td><strong>${thisMonthWorkouts.length}</strong></td>
      <td>${lastDate}</td>
      <td><button class="btn btn-secondary btn-sm" data-user="${u.id}">Apri Scheda</button></td>
    `;
    tr.querySelector("button").addEventListener("click", () => {
      setActiveAthlete(u.id);
      document.querySelector('[data-tab="tabCalendar"]').click();
    });
    teamComparisonTbody.appendChild(tr);
  });
}

btnSyncExcelData.addEventListener("click", () => {
  const isCoachOrAdmin = (appRole === "admin" || appRole === "allenatore" || (coachInfo && coachInfo.uid === (currentUser && currentUser.uid)));
  if (!isCoachOrAdmin) {
    showToast("Solo l'Allenatore o l'Admin possono risincronizzare i dati Excel!", "error");
    return;
  }
  if (confirm("Vuoi risincronizzare tutti gli allenamenti originali dell'allenatore dal file Excel?")) {
    seedCoachWorkoutsToFirestore(true);
  }
});

// --- 17. DETTAGLIO GIORNATA MODALE ---
function openDayDetailModal(dateObj, dayWorkouts) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateFormatted = dateObj.toLocaleDateString('it-IT', options);
  dayModalTitle.textContent = `Allenamenti di ${dateFormatted}`;

  dayModalBody.innerHTML = "";

  if (dayWorkouts.length === 0) {
    dayModalBody.innerHTML = `<p class="text-dim">Nessun allenamento registrato in questa data.</p>`;
  } else {
    dayWorkouts.forEach(w => {
      const card = createWorkoutCard(w);
      dayModalBody.appendChild(card);
    });
  }

  btnDayModalAddWorkout.onclick = () => {
    dayDetailModal.classList.add("hidden");
    workoutDate.valueAsDate = dateObj;
    document.querySelector('[data-tab="tabNew"]').click();
  };

  dayDetailModal.classList.remove("hidden");
}

btnCloseDayModal.addEventListener("click", () => {
  dayDetailModal.classList.add("hidden");
});

// --- 18. MODALE AUTENTICAZIONE ---
function openAuthModal() {
  authErrorMsg.classList.add("hidden");
  authModal.classList.remove("hidden");
}

function closeAuthModal() {
  authModal.classList.add("hidden");
}

btnCloseAuthModal.addEventListener("click", closeAuthModal);

tabBtnLogin.addEventListener("click", () => {
  tabBtnLogin.classList.add("active");
  tabBtnRegister.classList.remove("active");
  groupRegisterName.style.display = "none";
  btnSubmitEmailAuth.textContent = "Accedi con Email";
});

tabBtnRegister.addEventListener("click", () => {
  tabBtnRegister.classList.add("active");
  tabBtnLogin.classList.remove("active");
  groupRegisterName.style.display = "block";
  btnSubmitEmailAuth.textContent = "Registrati come Atleta";
});

btnGateGoogleLogin.addEventListener("click", () => {
  signInWithGoogle();
});

btnGateEmailLogin.addEventListener("click", () => {
  openAuthModal();
});

emailAuthForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authErrorMsg.classList.add("hidden");
  const email = authEmail.value.trim();
  const password = authPassword.value;
  const isRegister = tabBtnRegister.classList.contains("active");

  try {
    if (isRegister) {
      // Validazione password complessa obbligatoria
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        const failedRules = pwCheck.rules.filter(r => !r.test).map(r => r.label).join(", ");
        authErrorMsg.textContent = "La password non è abbastanza sicura. Mancano: " + failedRules;
        authErrorMsg.classList.remove("hidden");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const displayName = authDisplayName.value.trim() || email.split("@")[0];
      await updateProfile(user, { displayName });

      // Ogni nuova registrazione è ESCLUSIVAMENTE un atleta
      await syncUserToFirestore(user, "atleta");

      closeAuthModal();
      showToast(`Registrazione riuscita! Benvenuto ${displayName}`, "success");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      closeAuthModal();
      showToast("Accesso effettuato con successo!", "success");
    }
  } catch (error) {
    console.error("Errore autenticazione:", error);
    let msg = "Errore durante l'autenticazione: " + error.message;
    if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
      msg = "Email o password non corretti.";
    } else if (error.code === "auth/email-already-in-use") {
      msg = "Indirizzo email già registrato. Prova ad accedere.";
    } else if (error.code === "auth/weak-password") {
      msg = "La password deve contenere almeno 6 caratteri.";
    }
    authErrorMsg.textContent = msg;
    authErrorMsg.classList.remove("hidden");
  }
});

async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, googleProvider);
    closeAuthModal();
  } catch (error) {
    console.error("Google Auth:", error);
    authErrorMsg.textContent = "Accesso Google non riuscito: " + error.message;
    authErrorMsg.classList.remove("hidden");
  }
}

btnModalGoogleLogin.addEventListener("click", signInWithGoogle);

// --- 19. EVENT LISTENERS GENERALI ---
function setupEventListeners() {
  btnPrevMonth.addEventListener("click", () => {
    currentCalendarMonth = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1);
    renderCalendar();
  });

  btnNextMonth.addEventListener("click", () => {
    currentCalendarMonth = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  btnTodayMonth.addEventListener("click", () => {
    const now = new Date();
    currentCalendarMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    renderCalendar();
  });

  athleteSelectDropdown.addEventListener("change", (e) => {
    setActiveAthlete(e.target.value);
  });

  btnViewSelectedAthlete.addEventListener("click", () => {
    viewMode = "single";
    updateAthleteSwitcherUI();
    refreshActiveViews();
  });

  btnViewAllAthletes.addEventListener("click", () => {
    viewMode = "all";
    updateAthleteSwitcherUI();
    refreshActiveViews();
  });

  searchInput.addEventListener("input", () => {
    btnClearSearch.classList.toggle("hidden", !searchInput.value);
    renderWorkoutsFeed();
  });

  btnClearSearch.addEventListener("click", () => {
    searchInput.value = "";
    btnClearSearch.classList.add("hidden");
    renderWorkoutsFeed();
  });

  filterCategory.addEventListener("change", renderWorkoutsFeed);
  sortOrder.addEventListener("change", renderWorkoutsFeed);
}

// --- PASSWORD VALIDATION & CHANGE ---
function validatePassword(password) {
  const rules = [
    { id: "length", label: "Almeno 8 caratteri", test: password.length >= 8 },
    { id: "uppercase", label: "Almeno una lettera maiuscola (A-Z)", test: /[A-Z]/.test(password) },
    { id: "lowercase", label: "Almeno una lettera minuscola (a-z)", test: /[a-z]/.test(password) },
    { id: "number", label: "Almeno un numero (0-9)", test: /[0-9]/.test(password) },
    { id: "special", label: "Almeno un carattere speciale (!@#$%...)", test: /[^A-Za-z0-9]/.test(password) },
  ];
  const valid = rules.every(r => r.test);
  return { valid, rules };
}

function renderPasswordStrength(containerEl, password) {
  if (!containerEl) return;
  if (!password) {
    containerEl.innerHTML = "";
    containerEl.classList.add("hidden");
    return;
  }
  const { valid, rules } = validatePassword(password);
  const passed = rules.filter(r => r.test).length;
  const total = rules.length;
  const pct = Math.round((passed / total) * 100);

  let strengthLabel, strengthClass;
  if (pct <= 20) { strengthLabel = "Molto debole"; strengthClass = "pw-very-weak"; }
  else if (pct <= 40) { strengthLabel = "Debole"; strengthClass = "pw-weak"; }
  else if (pct <= 60) { strengthLabel = "Discreta"; strengthClass = "pw-fair"; }
  else if (pct <= 80) { strengthLabel = "Buona"; strengthClass = "pw-good"; }
  else { strengthLabel = "Forte 💪"; strengthClass = "pw-strong"; }

  containerEl.classList.remove("hidden");
  containerEl.innerHTML = `
    <div class="pw-strength-bar">
      <div class="pw-strength-fill ${strengthClass}" style="width: ${pct}%"></div>
    </div>
    <span class="pw-strength-label ${strengthClass}">${strengthLabel}</span>
    <ul class="pw-rules-list">
      ${rules.map(r => `<li class="${r.test ? "pw-rule-pass" : "pw-rule-fail"}">${r.test ? "✅" : "❌"} ${r.label}</li>`).join("")}
    </ul>
  `;
}

// Live strength indicator for registration form
const authPasswordField = document.getElementById("authPassword");
const pwStrengthRegister = document.getElementById("pwStrengthRegister");
if (authPasswordField && pwStrengthRegister) {
  authPasswordField.addEventListener("input", () => {
    const isRegister = tabBtnRegister.classList.contains("active");
    if (isRegister) {
      renderPasswordStrength(pwStrengthRegister, authPasswordField.value);
    } else {
      pwStrengthRegister.innerHTML = "";
      pwStrengthRegister.classList.add("hidden");
    }
  });
}

// Change Password Modal Logic
const changePasswordModal = document.getElementById("changePasswordModal");
const btnCloseChangePw = document.getElementById("btnCloseChangePw");
const changePwForm = document.getElementById("changePwForm");
const cpCurrentPw = document.getElementById("cpCurrentPassword");
const cpNewPw = document.getElementById("cpNewPassword");
const cpConfirmPw = document.getElementById("cpConfirmPassword");
const cpErrorMsg = document.getElementById("cpErrorMsg");
const cpSuccessMsg = document.getElementById("cpSuccessMsg");
const pwStrengthChange = document.getElementById("pwStrengthChange");

if (cpNewPw && pwStrengthChange) {
  cpNewPw.addEventListener("input", () => {
    renderPasswordStrength(pwStrengthChange, cpNewPw.value);
  });
}

function openChangePasswordModal() {
  if (!changePasswordModal) return;
  changePasswordModal.classList.remove("hidden");
  cpErrorMsg.classList.add("hidden");
  cpSuccessMsg.classList.add("hidden");
  if (changePwForm) changePwForm.reset();
  if (pwStrengthChange) { pwStrengthChange.innerHTML = ""; pwStrengthChange.classList.add("hidden"); }
}

function closeChangePasswordModal() {
  if (!changePasswordModal) return;
  changePasswordModal.classList.add("hidden");
}

if (btnCloseChangePw) {
  btnCloseChangePw.addEventListener("click", closeChangePasswordModal);
}

if (changePasswordModal) {
  changePasswordModal.addEventListener("click", (e) => {
    if (e.target === changePasswordModal) closeChangePasswordModal();
  });
}

if (changePwForm) {
  changePwForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    cpErrorMsg.classList.add("hidden");
    cpSuccessMsg.classList.add("hidden");

    const currentPw = cpCurrentPw.value;
    const newPw = cpNewPw.value;
    const confirmPw = cpConfirmPw.value;

    if (newPw !== confirmPw) {
      cpErrorMsg.textContent = "Le due nuove password non coincidono.";
      cpErrorMsg.classList.remove("hidden");
      return;
    }

    const { valid, rules } = validatePassword(newPw);
    if (!valid) {
      const failedRules = rules.filter(r => !r.test).map(r => r.label).join(", ");
      cpErrorMsg.textContent = "La nuova password non soddisfa i requisiti: " + failedRules;
      cpErrorMsg.classList.remove("hidden");
      return;
    }

    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);

      cpSuccessMsg.textContent = "Password cambiata con successo! ✅";
      cpSuccessMsg.classList.remove("hidden");
      changePwForm.reset();
      if (pwStrengthChange) { pwStrengthChange.innerHTML = ""; pwStrengthChange.classList.add("hidden"); }
      showToast("Password aggiornata con successo!", "success");

      setTimeout(() => closeChangePasswordModal(), 2000);
    } catch (error) {
      console.error("Errore cambio password:", error);
      let msg = "Errore durante il cambio password.";
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        msg = "La password attuale inserita non è corretta.";
      } else if (error.code === "auth/too-many-requests") {
        msg = "Troppi tentativi. Riprova tra qualche minuto.";
      } else if (error.code === "auth/requires-recent-login") {
        msg = "Sessione scaduta. Esci e riaccedi prima di cambiare la password.";
      }
      cpErrorMsg.textContent = msg;
      cpErrorMsg.classList.remove("hidden");
    }
  });
}

// --- UTILITY ---
function formatDateToISO(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = "success") {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.className = "toast";
  }, 3500);
}
