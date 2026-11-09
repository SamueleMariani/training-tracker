// app.js - Training Tracker Atletica & Velocità
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
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

// --- 2. DEFINIZIONE CATEGORIE ATLETICA & COLORI ---
export const CATEGORIES = {
  velocita: {
    id: "velocita",
    label: "Velocità",
    bg: "#FFF2CC",
    border: "#EAB308",
    color: "#854D0E",
    icon: "⚡",
    coachOnly: false
  },
  accelerazioni: {
    id: "accelerazioni",
    label: "Accelerazioni",
    bg: "#FCE7F3",
    border: "#F472B6",
    color: "#9D174D",
    icon: "🚀",
    coachOnly: false
  },
  ritmica: {
    id: "ritmica",
    label: "Ritmica",
    bg: "#CCFBF1",
    border: "#2DD4BF",
    color: "#0F766E",
    icon: "🎵",
    coachOnly: false
  },
  lattacido: {
    id: "lattacido",
    label: "Lattacido",
    bg: "#FEE2E2",
    border: "#F87171",
    color: "#991B1B",
    icon: "🔥",
    coachOnly: false
  },
  soglia: {
    id: "soglia",
    label: "Soglia",
    bg: "#E0F2FE",
    border: "#38BDF8",
    color: "#0369A1",
    icon: "⏱️",
    coachOnly: false
  },
  rv: {
    id: "rv",
    label: "RV (Resistenza Veloce)",
    bg: "#FFEDD5",
    border: "#FB923C",
    color: "#9A3412",
    icon: "🏃",
    coachOnly: false
  },
  forza: {
    id: "forza",
    label: "Forza",
    bg: "#DCFCE7",
    border: "#4ADE80",
    color: "#166534",
    icon: "🏋️",
    coachOnly: false
  },
  balzi: {
    id: "balzi",
    label: "Balzi",
    bg: "#F3E8FF",
    border: "#C084FC",
    color: "#6B21A8",
    icon: "🦘",
    coachOnly: false
  },
  fondo_lento: {
    id: "fondo_lento",
    label: "Fondo Lento",
    bg: "#F1F5F9",
    border: "#CBD5E1",
    color: "#334155",
    icon: "👟",
    coachOnly: false
  },
  sci: {
    id: "sci",
    label: "Sci",
    bg: "#DBEAFE",
    border: "#60A5FA",
    color: "#1E40AF",
    icon: "⛷️",
    coachOnly: true
  },
  nuoto: {
    id: "nuoto",
    label: "Nuoto (Jolly)",
    bg: "#E2E8F0",
    border: "#94A3B8",
    color: "#475569",
    icon: "🏊",
    coachOnly: true
  },
  riposo: {
    id: "riposo",
    label: "Riposo",
    bg: "#1E293B",
    border: "#475569",
    color: "#94A3B8",
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
const authRoleSelect = document.getElementById("authRoleSelect");
const optRoleCoach = document.getElementById("optRoleCoach");
const roleNotice = document.getElementById("roleNotice");
const groupRegisterName = document.getElementById("groupRegisterName");
const groupRegisterRole = document.getElementById("groupRegisterRole");
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
      registeredUsers = { ...registeredUsers, ...JSON.parse(cachedUsers) };
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

    // Se un altro utente si registra, non può scegliere 'allenatore'
    if (optRoleCoach) {
      optRoleCoach.disabled = true;
      optRoleCoach.textContent = "📋 Allenatore (Già assegnato)";
    }
    if (roleNotice) {
      roleNotice.textContent = "L'Allenatore unico è già stato assegnato.";
    }
  } else {
    if (optRoleCoach) {
      optRoleCoach.disabled = false;
      optRoleCoach.textContent = "📋 Allenatore (Unico coach - entra per primo)";
    }
    if (roleNotice) {
      roleNotice.textContent = "Il primo utente che effettua l'accesso come allenatore ottiene la titolarità della scheda.";
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
      // Determinazione ruolo
      const emailLower = (user.email || "").toLowerCase();
      
      if (emailLower.includes("samuele") || emailLower === "admin@trainingtracker.it") {
        appRole = "admin";
        activeAthleteId = "samuele_admin";
      } else if (coachInfo && coachInfo.claimed && (coachInfo.uid === user.uid || coachInfo.email === user.email)) {
        appRole = "allenatore";
        activeAthleteId = user.uid;
      } else if (!coachInfo.claimed) {
        // Se non c'è ancora un allenatore e l'utente ha scelto allenatore o email coerente
        const savedRole = localStorage.getItem(`tt_user_role_${user.uid}`);
        if (savedRole === "allenatore" || emailLower.includes("allenatore") || emailLower.includes("coach")) {
          claimCoachSlot(user);
        } else {
          appRole = "atleta";
          activeAthleteId = user.uid;
        }
      } else {
        appRole = "atleta";
        activeAthleteId = user.uid;
      }

      // Aggiungi utente loggato al roster se non presente
      if (!registeredUsers[user.uid]) {
        registeredUsers[user.uid] = {
          id: user.uid,
          name: user.displayName || user.email.split("@")[0],
          email: user.email,
          role: appRole,
          avatar: appRole === "admin" ? "👑" : (appRole === "allenatore" ? "📋" : "🏃")
        };
        saveLocalUsers();
      }

      // Mostra l'applicazione completa
      loginGate.classList.add("hidden");
      authenticatedApp.classList.remove("hidden");
      athleteSwitcherBar.classList.remove("hidden");

      renderAuthUI(user);
      updateAthleteDropdowns();
      updateAthleteSwitcherUI();
      renderCategoryChips();
      refreshActiveViews();
      updateCoachStatusUI();
      showToast(`Benvenuto, ${user.displayName || user.email}!`, "success");
    } else {
      // Non autenticato: l'utente può esplorare e visualizzare tutto ("va bene che tutti possano vedee tutto, opzionalmente")
      appRole = "ospite";
      activeAthleteId = "allenatore";
      loginGate.classList.add("hidden");
      authenticatedApp.classList.remove("hidden");
      athleteSwitcherBar.classList.remove("hidden");

      renderAuthUI(null);
      updateAthleteDropdowns();
      updateAthleteSwitcherUI();
      renderCategoryChips();
      refreshActiveViews();
      updateCoachStatusUI();
    }
  });
}

function renderAuthUI(user) {
  authBox.innerHTML = "";
  if (user) {
    const profile = document.createElement("div");
    profile.className = "user-profile";
    const avatarSrc = user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`;
    
    profile.innerHTML = `
      <img src="${avatarSrc}" class="user-avatar" alt="Avatar" />
      <div class="user-meta">
        <span class="user-name">${escapeHtml(user.displayName || user.email.split("@")[0])}</span>
        <span class="user-role-tag">${appRole.toUpperCase()}</span>
      </div>
      <button id="btnLogout" class="btn btn-secondary btn-sm" title="Disconnettiti">Esci</button>
    `;
    authBox.appendChild(profile);

    document.getElementById("btnLogout").addEventListener("click", async () => {
      await signOut(auth);
      showToast("Disconnessione effettuata", "success");
    });
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
  if (formAthleteTarget) formAthleteTarget.innerHTML = "";

  // Roster pulito: Allenatore, Samuele (Admin & Atleta), e gli atleti registrati
  const coachLabel = (coachInfo && coachInfo.name) ? `📋 ${coachInfo.name} (Coach)` : `📋 Allenatore (Dati da Excel)`;
  
  const entries = [
    { id: "allenatore", label: coachLabel },
    { id: "samuele_admin", label: "👑 Samuele (Admin & Atleta)" }
  ];

  // Aggiungi atleti reali registrati
  Object.values(registeredUsers).forEach(u => {
    if (u.id !== "allenatore" && u.id !== "samuele_admin") {
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

    if (formAthleteTarget) {
      const opt2 = document.createElement("option");
      opt2.value = e.id;
      opt2.textContent = e.label;
      formAthleteTarget.appendChild(opt2);
    }
  });

  athleteSelectDropdown.value = activeAthleteId;
  if (formAthleteTarget) formAthleteTarget.value = activeAthleteId;
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
      return w.userId === "samuele_admin" || (w.userEmail && w.userEmail.includes("samuele"));
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
        pill.style.borderLeftColor = catObj.border || catObj.color;
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
      openDayDetailModal(cellDate, dayWorkouts);
    });
  } else if (!isOtherMonth) {
    cell.addEventListener("click", () => {
      workoutDate.valueAsDate = cellDate;
      document.querySelector('[data-tab="tabNew"]').click();
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
        <div class="progress-fill" style="width: ${percentage}%; background-color: ${cat.border || cat.color};"></div>
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
      <div class="workout-actions">
        <button class="btn-action-del" data-id="${w.id}">🗑️ Elimina</button>
      </div>
    </div>
  `;

  const delBtn = card.querySelector(".btn-action-del");
  delBtn.addEventListener("click", () => deleteWorkout(w.id));

  return card;
}

async function deleteWorkout(workoutId) {
  if (!confirm("Sei sicuro di voler eliminare questo allenamento?")) return;

  try {
    const docRef = doc(db, "workouts", workoutId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Eliminazione Firestore:", err);
  }

  allWorkouts = allWorkouts.filter(w => w.id !== workoutId);
  saveLocalWorkoutsCache();
  refreshActiveViews();
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

// Invio form
workoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (selectedCategoriesForNewWorkout.size === 0) {
    showToast("Seleziona almeno una categoria per l'allenamento!", "error");
    return;
  }

  const targetAthlete = formAthleteTarget ? formAthleteTarget.value : activeAthleteId;
  let targetUserObj = registeredUsers[targetAthlete];
  if (!targetUserObj) {
    targetUserObj = { id: targetAthlete, name: "Atleta", email: "atleta@trainingtracker.it" };
  }

  const newWorkout = {
    id: `workout_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: targetAthlete,
    userName: targetUserObj.name,
    userEmail: targetUserObj.email,
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
  document.querySelector('[data-tab="tabCalendar"]').click();
});

function resetWorkoutForm() {
  workoutForm.reset();
  workoutDate.valueAsDate = new Date();
  selectedCategoriesForNewWorkout.clear();
  renderCategoryChips();
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

  const usersList = Object.values(registeredUsers);
  const currentMonthPrefix = formatDateToISO(currentCalendarMonth).substring(0, 7);

  usersList.forEach(u => {
    const userWorkouts = allWorkouts.filter(w => {
      if (u.id === "allenatore" || (coachInfo && coachInfo.uid && u.id === coachInfo.uid)) {
        return w.userId === "allenatore" || (coachInfo && w.userId === coachInfo.uid) || (w.userEmail && w.userEmail.includes("allenatore"));
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
  groupRegisterRole.style.display = "none";
  btnSubmitEmailAuth.textContent = "Accedi con Email";
});

tabBtnRegister.addEventListener("click", () => {
  tabBtnRegister.classList.add("active");
  tabBtnLogin.classList.remove("active");
  groupRegisterName.style.display = "block";
  groupRegisterRole.style.display = "block";
  btnSubmitEmailAuth.textContent = "Registrati";
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
      const chosenRole = authRoleSelect.value;
      if (chosenRole === "allenatore" && coachInfo && coachInfo.claimed) {
        authErrorMsg.textContent = "Il ruolo di Allenatore è già stato assegnato a un altro account!";
        authErrorMsg.classList.remove("hidden");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const displayName = authDisplayName.value.trim() || email.split("@")[0];
      await updateProfile(user, { displayName });

      localStorage.setItem(`tt_user_role_${user.uid}`, chosenRole);

      if (chosenRole === "allenatore") {
        await claimCoachSlot(user, displayName);
      }

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
