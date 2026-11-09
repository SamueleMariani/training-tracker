# ⚡ Training Tracker

Una webapp semplice, reattiva e moderna per tracciare i tuoi allenamenti, carichi e serie in palestra, ospitata gratuitamente su **GitHub Pages** con database in tempo reale su **Firebase Cloud Firestore**.

## 🚀 Funzionalità

* **Autenticazione con Google & Modalità Ospite**: Accedi con il tuo account Google oppure prova l'app direttamente come ospite.
* **Inserimento Esercizi Dinamico**: Aggiungi esercizi, serie, carichi (kg) e ripetizioni al volo.
* **Database in Tempo Reale**: I dati vengono sincronizzati istantaneamente con Google Firebase Firestore.
* **Storico & Statistiche**: Conteggio sessioni totali, allenamenti del mese e visualizzazione dettagliata degli allenamenti passati con ricerca.
* **Design Dark Mode da Palestra**: Interfaccia curata, fluida e adatta sia a smartphone che a desktop.

---

## 🌐 Come attivare GitHub Pages (Hosting Gratuito)

1. Vai sul tuo repository: [https://github.com/SamueleMariani/training-tracker](https://github.com/SamueleMariani/training-tracker)
2. Clicca su **Settings** (in alto a destra nel repo).
3. Nel menu laterale a sinistra, clicca su **Pages**.
4. Sotto **Build and deployment > Branch**:
   * Seleziona `main`
   * Lascia la cartella su `/ (root)`
   * Clicca su **Save**.
5. Attendi circa 1 minuto: in cima alla pagina comparirà il tuo link live:
   👉 `https://samuelemariani.github.io/training-tracker/`

---

## ⚙️ Configurazione Firebase

Se usi l'accesso con Google su GitHub Pages:
1. Vai su [Firebase Console](https://console.firebase.google.com/) > **Authentication** > scheda **Settings** (Impostazioni).
2. Scorri fino a **Domini autorizzati** (Authorized domains).
3. Aggiungi il dominio `samuelemariani.github.io` per consentire l'accesso con Google anche dal sito online.
