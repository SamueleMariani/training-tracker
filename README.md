# ⚡ Training Tracker - Atletica & Velocità

Web application moderna, reattiva e completa per il tracciamento degli allenamenti di atletica leggera (velocità, staffette, prove multiple), sincronizzata in tempo reale con **Google Firebase Firestore** e **Firebase Authentication** (Google Sign-In + Email/Password).

---

## 🎯 Caratteristiche Principali

### 1. 👥 Gestione Profili & Ruoli
* **👑 Admin (Samuele)**: Ha visibilità completa su tutta la squadra, può filtrare e consultare le schede di qualsiasi atleta e **si allena a sua volta**, registrando le proprie sessioni nella sua scheda personale.
* **📋 Allenatore (Coach)**: Ha visibilità su tutti gli atleti, accesso alle categorie esclusive (*Sci* e *Nuoto Jolly*) e trova **già pre-popolato l'intero piano di allenamenti** estratto dal file originale `allenamenti_velocità_atletica.xlsx` (25 sessioni complete tra Novembre 2026 e Gennaio 2027).
* **🏃 Atleti**: Ciascun atleta ha il proprio profilo personale, il proprio diario e il calendario mensile dedicato.
* **Switch Rapido**: Barra contestuale in cima all'applicazione per passare istantaneamente dalla visualizzazione della singola scheda atleta a quella dell'intera squadra (*"👤 Scheda Atleta"* vs *"👥 Tutta la Squadra"*).

---

### 2. 🏷️ Categorie Atletica & Codici Colore Fedeli al File Excel
Le categorie rispecchiano fedelmente la formattazione condizionale e i colori del foglio Excel dell'allenatore, arricchite con le nuove categorie richieste:

| Categoria | Colore | Note & Ruolo |
| :--- | :--- | :--- |
| **⚡ Velocità** | Giallo pastello (`#FFF2CC` / `#EAB308`) | Sprint, blocchi, reattività |
| **🚀 Accelerazioni** | Rosa (`#FCE7F3` / `#F472B6`) | Come richiesto |
| **🎵 Ritmica** | Turchese (`#CCFBF1` / `#2DD4BF`) | Nuova categoria elegante |
| **🔥 Lattacido** | Rosso corallo (`#FEE2E2` / `#F87171`) | Ripetute lattacide ad alta intensità |
| **⏱️ Soglia** | Azzurro cielo (`#E0F2FE` / `#38BDF8`) | Lavoro aerobico e soglia anaerobica |
| **🏃 RV (Resistenza Veloce)** | Arancione ambra (`#FFEDD5` / `#FB923C`) | Resistenza alla velocità |
| **🏋️ Forza** | Verde smeraldo (`#DCFCE7` / `#4ADE80`) | Massimali, squat, carichi |
| **🦘 Balzi** | Viola lavanda (`#F3E8FF` / `#C084FC`) | Pliometria, ostacoli, rimbalzi |
| **👟 Fondo Lento** | Grigio chiaro (`#F1F5F9` / `#CBD5E1`) | Corsa continua di recupero |
| **⛷️ Sci** | Blu ghiaccio (`#DBEAFE` / `#60A5FA`) | *Riservato solo all'Allenatore* |
| **🏊 Nuoto** | Grigia Jolly (`#E2E8F0` / `#94A3B8`) | *Riservato solo all'Allenatore* |
| **🛌 Riposo** | Slate scuro (`#1E293B`) | Giorni di recupero attivo o riposo |

---

### 3. 🔀 Supporto Multi-Categoria per Allenamento
* Un singolo allenamento può appartenere a **più categorie contemporaneamente** (es. *Velocità* + *Accelerazioni*, oppure *Forza* + *Balzi*).
* Nel form di inserimento le categorie si attivano/disattivano con un click a pillole interattive.
* Sul calendario e nel diario vengono mostrati tutti i relativi badge colorati con icone dedicate.

---

### 4. 📅 Panoramica Mensile & Calendario Interattivo
* **Navigazione Mese**: Pulsanti Mese Precedente, Mese Successivo e "Oggi".
* **Griglia Mensile Lun–Dom**: Ogni giornata mostra i micro-badge delle categorie svolte e l'anteprima delle specifiche.
* **Click sul Giorno**: Apre un pop-up con tutti gli allenamenti del giorno e i riscontri cronometrici.
* **📊 Distribuzione Categorie del Mese**: Calcolo automatico della percentuale e del numero di sedute per categoria con barre di avanzamento colorate.

---

### 5. 📝 Diario Allenamenti & Filtri
* Ricerca full-text rapida su specifiche (es. `4x300`, `60m`, `piramide`), tempi cronometrici e note.
* Filtro per categoria singola o tutte le categorie.
* Ordinamento cronologico crescente o decrescente.
* Visualizzazione ad alto contrasto di **Specifiche** e **Tempi/Carichi** in font monospace ad alta leggibilità.

---

### 6. 🔐 Autenticazione Completa Firebase
* **Google Sign-In**: Login con un click tramite account Google.
* **Email & Password**: Registrazione e login con validazione, scelta nome atleta e ruolo.

---

## 💻 Come Avviare l'Applicazione in Locale

Avendo Node.js installato, puoi avviare un server locale leggero direttamente nella cartella:

```powershell
# Esempio con npx serve
npx serve .
```

Oppure aprendo semplicemente il file `index.html` nel browser o servendolo tramite qualsiasi estensione Live Server di VSCode / Antigravity.
