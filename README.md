# PlacementPro 🚀

> AI-powered all-in-one placement preparation platform for Indian students

## Features
- 📄 **Resume Analyzer** — AI feedback, ATS score, skill gap analysis
- 🛡️ **Fake Job Detector** — Detect scam job postings instantly
- 💼 **Job Portal** — Verified fresher-friendly jobs
- 🎤 **Interview Prep** — AI mock interviews with real-time evaluation
- 👥 **Interview Experiences** — Real student experiences from top companies

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MongoDB
- **AI:** Anthropic Claude API

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB (local or MongoDB Atlas)
- Anthropic API key → https://console.anthropic.com

---

### Step 1 — Create the `.env` file

Inside the `server/` folder, create a file named `.env`:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/placementpro
JWT_SECRET=mysecretkey123placementpro2025
ANTHROPIC_API_KEY=your_anthropic_api_key_here
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

Replace `your_anthropic_api_key_here` with your real key.

---

### Step 2 — Install dependencies

Open **two terminals:**

**Terminal 1 (Backend):**
```bash
cd server
npm install
```

**Terminal 2 (Frontend):**
```bash
cd client
npm install
```

---

### Step 3 — Start the app

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

Open → http://localhost:5173

---

### Step 4 — Load sample data (optional)

After logging in, go to:
- **Job Portal** → click "Load Sample Jobs"
- **Experiences** → click "Load Samples"

---

## 📁 File Structure

```
placementpro/
├── package.json
├── server/
│   ├── .env                  ← CREATE THIS MANUALLY
│   ├── index.js
│   ├── package.json
│   ├── config/ai.js
│   ├── middleware/auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Job.js
│   │   ├── Interview.js
│   │   └── Experience.js
│   └── routes/
│       ├── auth.js
│       ├── resume.js
│       ├── jobs.js
│       ├── interview.js
│       ├── experiences.js
│       └── dashboard.js
└── client/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── context/AuthContext.jsx
        ├── components/Layout.jsx
        └── pages/
            ├── Landing.jsx
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx
            ├── ResumeAnalyzer.jsx
            ├── JobPortal.jsx
            ├── FakeDetector.jsx
            ├── Interview.jsx
            └── Experiences.jsx
```

---

## 🔑 API Key

Get your free Anthropic API key at: https://console.anthropic.com/settings/keys

The AI features (Resume Analyzer, Fake Detector, Interview Prep) require this key.
