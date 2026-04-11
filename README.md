# Student Performance Dashboard

A modern, comprehensive web application built for tracking and analyzing student performance. This dashboard allows educators and administrators to upload CSV data containing student grades and dynamically visualize performance trends, subject-wise statistics, and class toppers.

## 🚀 Features

- **CSV Data Upload:** Effortlessly upload and parse student grades.
- **Performance Analytics:** View essential subject-wise performance metrics (mean, max, min).
- **Toppers List:** Automatically calculates SGPA & CGPA to rank the top 5 students.
- **Pass/Fail Ratios:** Quickly visualize the passing vs. failing rate of the entire class.
- **Semester Trends:** Track average student scores across different semesters.
- **Detailed Student Search:** Look up an individual student's details, SGPA history, and current CGPA using their Roll Number.
- **Export Capabilities:** Download individual student transcripts as cleanly formatted PDF and CSV files seamlessly from the dashboard.

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Backend:** Python, FastAPI, Uvicorn (ASGI Server)
- **Data Processing:** Pandas
- **PDF Generation:** xhtml2pdf
- **Database:** SQLite3

## 📋 Prerequisites

To run this project locally, ensure you have the following installed:
- [Python 3.8+](https://www.python.org/downloads/)

---

## ⚙️ Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/student-dashboard.git
cd student-dashboard
```

### 2. Backend Environment Setup
Navigate into the backend directory:
```bash
cd backend
```

*(Optional but highly recommended)*: Create and activate a isolated virtual environment:
```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

Install the required Python dependencies:
```bash
pip install -r requirements.txt
```

### 3. Start the Backend Server
Once the dependencies are installed, you can start the API. 
```bash
python -m uvicorn app:app --reload --port 8000
```
> **Tip for Windows users:** You can also simply double-click the `start.bat` file located inside the backend folder to automatically boot the server!

The API will now be successfully running on `http://127.0.0.1:8000`.

### 4. Start the Frontend Application
Since the frontend uses vanilla web technologies, there is no complicated build step required!
- Open the `frontend/dashboard.html` file in any modern web browser (e.g., Chrome, Edge, Safari).
- *Alternatively, use a tool like the **Live Server** VSCode extension for hot-reloading.*

---

## 🔌 API Reference (FastAPI)
The backend provides a fully functional REST API. Once the server is running, you can also view auto-generated documentation by visiting `http://127.0.0.1:8000/docs`.

### Core Endpoints:
- `POST /upload` - Accepts a `.csv` file upload containing roll, name, semester, subject, and marks.
- `GET /subjects` - Returns statistical breakdown (min, max, mean) per subject.
- `GET /toppers` - Returns the top 5 students based on calculated CGPA.
- `GET /passfail` - Calculates pass/fail split (Passing criteria: >=40 in all subjcets).
- `GET /trend` - Evaluates average mark trends per semester.
- `GET /student/{roll}` - Gets a detailed aggregated report for a specific student.
- `GET /student/{roll}/export` - Exports an individual student's detailed marks as a CSV file.
- `GET /student/{roll}/export/pdf` - Exports an individual student's detailed marks as a formatted PDF.

## 📝 License
This project is licensed under the MIT License.
