// Import Firebase SDK via CDN (Modular v10)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Configurazione Firebase dal tuo file
const firebaseConfig = {
  apiKey: "AIzaSyCcbESnxYIjeEVOGVV02DaoLiNE0nnV13U",
  authDomain: "trainingtracker-8d107.firebaseapp.com",
  projectId: "trainingtracker-8d107",
  storageBucket: "trainingtracker-8d107.firebasestorage.app",
  messagingSenderId: "1000187408413",
  appId: "1:1000187408413:web:dcb996e3caa5b8f174d6f4"
};

// Inizializzazione Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Stato Applicazione
let currentUser = null;
let workouts = [];
let unsubscribeFirestore = null;

// Elementi DOM
const authBox = document.getElementById("authBox");
const noticeBanner = document.getElementById("noticeBanner");
const workoutForm = document.getElementById("workoutForm");
const workoutDate = document.getElementById("workoutDate");
const workoutTitle = document.getElementById("workoutTitle");
const workoutDuration = document.getElementById("workoutDuration");
const workoutNotes = document.getElementById("workoutNotes");
const exerciseList = document.getElementById("exerciseList");
const btnAddExercise = document.getElementById("btnAddExercise");
const workoutsHistoryList = document.getElementById("workoutsHistoryList");
const searchInput = document.getElementById("searchInput");
const historyCountBadge = document.getElementById("historyCountBadge");

// Stats Elements
const statTotalWorkouts = document.getElementById("statTotalWorkouts");
const statThisMonth = document.getElementById("statThisMonth");
const statLastWorkout = document.getElementById("statLastWorkout");

// Imposta data di oggi come default
workoutDate.valueAsDate = new Date();

// --- 1. GESTIONE AUTENTICAZIONE ---

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  renderAuthUI(user);
  listenToWorkouts(user);
});

function renderAuthUI(user) {
  authBox.innerHTML = "";
  if (user) {
    const profile = document.createElement("div");
    profile.className = "user-profile";
    profile.innerHTML = `
      <img src="${user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.uid}" class="user-avatar" alt="Avatar" />
      <span class="user-name">${user.displayName || user.email}</span>
      <button id="btnLogout" class="btn btn-secondary btn-sm" title="Disconnettiti">Esci</button>
    `;
    authBox.appendChild(profile);

    document.getElementById("btnLogout").addEventListener("click", async () => {
      await signOut(auth);
      showToast("Disconnessione riuscita", "success");
    });

    noticeBanner.classList.add("hidden");
  } else {
    const loginBtn = document.createElement("button");
    loginBtn.className = "btn btn-primary btn-sm";
    loginBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
      </svg>
      Accedi con Google
    `;
    loginBtn.addEventListener("click", handleGoogleLogin);
    authBox.appendChild(loginBtn);

    noticeBanner.innerHTML = `
      <span>💡 Modalità Ospite attiva. Accedi con Google per sincronizzare i tuoi allenamenti personali!</span>
    `;
    noticeBanner.classList.remove("hidden");
  }
}

async function handleGoogleLogin() {
  try {
    await signInWithPopup(auth, provider);
    showToast("Accesso eseguito!", "success");
  } catch (error) {
    console.error("Login error:", error);
    if (error.code === "auth/configuration-not-found" || error.code === "auth/operation-not-allowed") {
      showToast("Attiva Google in Firebase Console > Authentication > Metodo di accesso!", "error");
    } else if (error.code === "auth/unauthorized-domain") {
      showToast("Aggiungi questo dominio a Domini autorizzati su Firebase Auth!", "error");
    } else {
      showToast("Errore durante l'accesso: " + error.message, "error");
    }
  }
}

// --- 2. GESTIONE ESERCIZI NEL FORM ---

function createExerciseCard(initialName = "", sets = [{ kg: "", reps: "" }]) {
  const card = document.createElement("div");
  card.className = "exercise-item";

  card.innerHTML = `
    <div class="exercise-item-header">
      <input type="text" class="exercise-name" placeholder="Nome Esercizio (es. Panca Piana, Squat)" value="${initialName}" required />
      <button type="button" class="btn btn-danger btn-icon btn-remove-exercise" title="Elimina Esercizio">✕</button>
    </div>
    
    <table class="sets-table">
      <thead>
        <tr>
          <th style="width: 40px">Set</th>
          <th>Carico (kg)</th>
          <th>Reps</th>
          <th style="width: 40px"></th>
        </tr>
      </thead>
      <tbody class="sets-body"></tbody>
    </table>

    <button type="button" class="btn btn-secondary btn-sm btn-add-set">+ Serie</button>
  `;

  const setsBody = card.querySelector(".sets-body");
  const btnAddSet = card.querySelector(".btn-add-set");
  const btnRemoveExercise = card.querySelector(".btn-remove-exercise");

  // Aggiungi righe serie
  function addSetRow(kg = "", reps = "") {
    const setIndex = setsBody.children.length + 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="set-index">${setIndex}</td>
      <td><input type="number" step="0.5" class="set-kg" placeholder="0" value="${kg}" required /></td>
      <td><input type="number" step="1" class="set-reps" placeholder="10" value="${reps}" required /></td>
      <td><button type="button" class="btn btn-danger btn-icon btn-remove-set" title="Rimuovi">✕</button></td>
    `;
    
    tr.querySelector(".btn-remove-set").addEventListener("click", () => {
      tr.remove();
      updateSetIndexes(setsBody);
    });

    setsBody.appendChild(tr);
  }

  sets.forEach(s => addSetRow(s.kg, s.reps));

  btnAddSet.addEventListener("click", () => addSetRow());

  btnRemoveExercise.addEventListener("click", () => {
    card.remove();
  });

  return card;
}

function updateSetIndexes(tbody) {
  Array.from(tbody.children).forEach((tr, idx) => {
    tr.querySelector(".set-index").textContent = idx + 1;
  });
}

// Inizializza con 1 esercizio di default
exerciseList.appendChild(createExerciseCard("Panca Piana con Bilanciere", [{ kg: "60", reps: "10" }, { kg: "70", reps: "8" }]));

btnAddExercise.addEventListener("click", () => {
  exerciseList.appendChild(createExerciseCard());
});

// Click sui Quick Tags
document.querySelectorAll(".quick-tags .tag").forEach(tag => {
  tag.addEventListener("click", () => {
    workoutTitle.value = tag.getAttribute("data-title");
  });
});

// --- 3. SALVATAGGIO ALLENAMENTO SU FIRESTORE ---

workoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = workoutTitle.value.trim();
  const date = workoutDate.value;
  const duration = parseInt(workoutDuration.value) || 0;
  const notes = workoutNotes.value.trim();

  // Raccogli esercizi
  const exerciseCards = exerciseList.querySelectorAll(".exercise-item");
  const exercises = [];

  exerciseCards.forEach(card => {
    const name = card.querySelector(".exercise-name").value.trim();
    const setRows = card.querySelectorAll(".sets-body tr");
    const sets = [];

    setRows.forEach(row => {
      const kg = parseFloat(row.querySelector(".set-kg").value) || 0;
      const reps = parseInt(row.querySelector(".set-reps").value) || 0;
      sets.push({ kg, reps });
    });

    if (name) {
      exercises.push({ name, sets });
    }
  });

  if (exercises.length === 0) {
    showToast("Aggiungi almeno un esercizio!", "error");
    return;
  }

  const workoutData = {
    title,
    date,
    duration,
    notes,
    exercises,
    userId: currentUser ? currentUser.uid : "guest",
    userEmail: currentUser ? currentUser.email : "Ospite",
    createdAt: serverTimestamp()
  };

  try {
    const targetCollection = currentUser 
      ? collection(db, "users", currentUser.uid, "workouts") 
      : collection(db, "workouts");

    await addDoc(targetCollection, workoutData);
    showToast("Allenamento salvato con successo! 💪", "success");

    // Reset Form
    workoutTitle.value = "";
    workoutNotes.value = "";
    workoutDuration.value = "";
    exerciseList.innerHTML = "";
    exerciseList.appendChild(createExerciseCard());
  } catch (error) {
    console.error("Errore salvataggio:", error);
    showToast("Errore nel salvataggio: " + error.message, "error");
  }
});

// --- 4. ASCOLTO IN TEMPO REALE DEGLI ALLENAMENTI ---

function listenToWorkouts(user) {
  if (unsubscribeFirestore) {
    unsubscribeFirestore();
  }

  const targetCollection = user 
    ? collection(db, "users", user.uid, "workouts") 
    : collection(db, "workouts");

  const q = query(targetCollection, orderBy("date", "desc"));

  unsubscribeFirestore = onSnapshot(q, (snapshot) => {
    workouts = [];
    snapshot.forEach(docSnap => {
      workouts.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderWorkouts(workouts);
    updateStats(workouts);
  }, (error) => {
    console.warn("Firestore snapshot warning (potrebbe servire indice o fallback):", error);
    // Fallback: carica senza ordinamento complesso
    onSnapshot(targetCollection, (snapshot) => {
      workouts = [];
      snapshot.forEach(docSnap => {
        workouts.push({ id: docSnap.id, ...docSnap.data() });
      });
      workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
      renderWorkouts(workouts);
      updateStats(workouts);
    });
  });
}

// --- 5. RENDERING STORICO E STATISTICHE ---

function renderWorkouts(list) {
  workoutsHistoryList.innerHTML = "";
  historyCountBadge.textContent = `${list.length} sessioni`;

  if (list.length === 0) {
    workoutsHistoryList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📋</span>
        <p>Nessun allenamento registrato.</p>
        <small>Compila il form a sinistra per salvare la tua prima sessione!</small>
      </div>
    `;
    return;
  }

  list.forEach(w => {
    const item = document.createElement("div");
    item.className = "history-card-item";

    const formattedDate = new Date(w.date + "T00:00:00").toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    const exercisesHtml = (w.exercises || []).map(ex => {
      const setsDesc = (ex.sets || []).map(s => `${s.kg}kg × ${s.reps}`).join(", ");
      return `
        <div class="history-exercise-line">
          <strong>${escapeHtml(ex.name)}</strong>
          <span>${setsDesc}</span>
        </div>
      `;
    }).join("");

    item.innerHTML = `
      <div class="history-item-top">
        <span class="history-item-date">📅 ${formattedDate}</span>
        ${w.duration ? `<span class="badge">⏱️ ${w.duration} min</span>` : ""}
      </div>
      <h3 class="history-item-title">${escapeHtml(w.title)}</h3>
      <div class="history-exercises-summary">
        ${exercisesHtml}
      </div>
      ${w.notes ? `<p class="history-notes">📝 ${escapeHtml(w.notes)}</p>` : ""}
      <div class="history-item-footer">
        <span class="badge badge-accent">${(w.exercises || []).length} esercizi</span>
        <button class="btn btn-danger btn-sm btn-delete-workout" data-id="${w.id}">Elimina</button>
      </div>
    `;

    item.querySelector(".btn-delete-workout").addEventListener("click", () => {
      deleteWorkout(w.id);
    });

    workoutsHistoryList.appendChild(item);
  });
}

async function deleteWorkout(id) {
  if (!confirm("Sei sicuro di voler eliminare questo allenamento?")) return;

  try {
    const targetDoc = currentUser 
      ? doc(db, "users", currentUser.uid, "workouts", id)
      : doc(db, "workouts", id);
      
    await deleteDoc(targetDoc);
    showToast("Allenamento eliminato", "success");
  } catch (error) {
    showToast("Errore eliminazione: " + error.message, "error");
  }
}

function updateStats(list) {
  statTotalWorkouts.textContent = list.length;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthCount = list.filter(w => {
    const d = new Date(w.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;
  statThisMonth.textContent = thisMonthCount;

  if (list.length > 0) {
    const lastDate = new Date(list[0].date + "T00:00:00").toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short"
    });
    statLastWorkout.textContent = lastDate;
  } else {
    statLastWorkout.textContent = "-";
  }
}

// Filtro / Ricerca
searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase().trim();
  if (!term) {
    renderWorkouts(workouts);
    return;
  }

  const filtered = workouts.filter(w => {
    const matchTitle = (w.title || "").toLowerCase().includes(term);
    const matchExercise = (w.exercises || []).some(ex => 
      (ex.name || "").toLowerCase().includes(term)
    );
    return matchTitle || matchExercise;
  });

  renderWorkouts(filtered);
});

// Helpers
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.className = "toast";
  }, 3500);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
