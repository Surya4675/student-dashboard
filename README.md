<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/en/a/a1/PSG_College_of_Technology_logo.png" width="120" alt="PSGCT Logo">
</div>

# PSG Tech Academic Analytics Dashboard 📊🎓

An enterprise-grade, high-performance web dashboard originally developed for the **Enterprise Computing using FullStack Hackathon** at **PSG College of Technology**.

This system ingests raw academic CSV data and dynamically transforms it into actionable, real-time insights, enabling administrators and professors to make data-driven decisions regarding student progress.

![Enterprise Level Dashboard](https://img.shields.io/badge/Status-Enterprise%20Ready-success)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20(Python)-blue)
![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20JS%20%2B%20CSS-orange)

## 🌐 Live Demonstration

The application is fully hosted online for immediate access! You can view the deployed architecture here:
* **Live Next-Gen Dashboard:** [https://psgct-student-dashboard.netlify.app](https://psgct-student-dashboard.netlify.app)
* **Live Backend Service:** Hosted on Render
* **FastAPI Swagger Docs:** [https://psgct-student-dashboard.onrender.com/docs](https://psgct-student-dashboard.onrender.com/docs)

## 🚀 Key Enterprise Features

* **Single Payload Architecture:** The backend aggregates heavy calculations (CGPA, Rankings, Trend Metrics) and delivers everything cleanly in a single `/dashboard-data` network call. This minimizes server strain and allows the UI to render flawlessly.
* **Student Comparison Module:** Compare two scholastic profiles head-to-head. Features dynamic SGPA calculations, winner tracking (🏆), and an interactive **Subject Gap Analysis** Radar Chart.
* **Interactive Diagnostic Visuals:** Features custom DOM-injected Pass/Fail progress trackers and deeply dynamic subject metric bars that change color (Green/Orange/Red) based on the class average curve.
* **Executive Tabbed Interface:** Organizes massive amounts of data into clean, digestible tabs (Executive Overview, Subject Metrics, Student Rankings) avoiding cognitive overload.
* **Automated PDF Generation:** Built-in PDF exporter creates comprehensive physical Executive Reports straight from the Python backend.

## 💻 Technology Stack
* **Frontend UI/UX:** HTML5, Modern CSS (Glassmorphism, Variables), Vanilla JavaScript.
* **Data Visualization:** Chart.js (Spider, Bar, Trend, Pie).
* **Backend:** Python + FastAPI (Asynchronous execution).
* **Data Engineering:** Pandas & NumPy.
* **Database:** SQLite3.
* **Reporting:** xhtml2pdf.

## ⚙️ How to Run Locally

1. **Clone the repository.**
2. **Setup the Backend Server:**
   Ensure you have Python installed.
   ```bash
   cd backend
   pip install -r requirements.txt
   python -m uvicorn app:app --reload --port 8000
   ```
3. **Launch the Frontend:**
   You do not need a NodeJS server! Simply navigate to the `frontend` directory and double-click `index.html` to load it in your browser.
4. **Ingest Data:**
   Upload your student dataset (`.csv`) and let the application generate your metrics.

## 📈 Scalability Roadmap (For Production Hosting)
Currently designed as a monolithic MVP for the hackathon. To scale this for the entire University workload, the architecture is prepared for the following upgrades:
* **Database Upgrade:** Migrate `students.db` (SQLite) to **PostgreSQL** or **AWS RDS** to handle concurrent writes without locking.
* **Caching Layer:** Implement **Redis** to cache the Pandas DataFrame computational outputs (like percentiles and rankings) to save backend computing cycles.
* **Containerization:** Deploy the FastAPI server using **Docker** alongside **Nginx/Load Balancer** to handle thousands of requests seamlessly.

---
**Prepared specifically for the PSG College of Technology Enterprise Hackathon.**
