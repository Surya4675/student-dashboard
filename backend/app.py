from fastapi import FastAPI, UploadFile, Response
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import BytesIO
from xhtml2pdf import pisa
from db import insert_data, conn
from processor import calculate_sgpa, calculate_cgpa

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Upload CSV
@app.post("/upload")
async def upload_csv(file: UploadFile):

    try:
        df = pd.read_csv(file.file)
    except Exception:
        return {"error": "Invalid or corrupt CSV format."}

    if df.empty:
        return {"error": "The uploaded CSV file is empty."}

    required = ["name", "roll", "semester", "subject", "marks"]
    for col in required:
        if col not in df.columns:
            return {"error": f"Missing required column: {col}"}

    # Handle missing/edge-case values
    df = df.dropna(subset=["name", "roll", "semester", "subject"])
    df["marks"] = pd.to_numeric(df["marks"], errors="coerce").fillna(0)

    insert_data(df)

    return {"message": "Uploaded successfully"}


# Subject Analysis
@app.get("/subjects")
def subject_performance():

    df = pd.read_sql("SELECT * FROM students", conn)

    result = df.groupby("subject")["marks"].agg(["mean", "max", "min"]).reset_index()

    return result.to_dict(orient="records")


# Topper List
@app.get("/toppers")
def toppers():

    df = pd.read_sql("SELECT * FROM students", conn)

    sgpa = calculate_sgpa(df)
    cgpa = calculate_cgpa(sgpa)

    top = cgpa.sort_values(by="grade", ascending=False).head(5)

    return top.to_dict(orient="records")


#  Pass/Fail
@app.get("/passfail")
def pass_fail():
    df = pd.read_sql("SELECT * FROM students", conn)
    if df.empty:
        return {"Pass": 0, "Fail": 0}
        
    # Group by student roll number to see if their minimum mark is below passing
    student_min_marks = df.groupby("roll")["marks"].min()
    
    # A student passes only if their lowest mark across all subjects is >= 40
    status_counts = student_min_marks.apply(lambda x: "Pass" if x >= 40 else "Fail").value_counts().to_dict()
    
    return {
        "Pass": status_counts.get("Pass", 0),
        "Fail": status_counts.get("Fail", 0)
    }

# Semester Trend
@app.get("/trend")
def semester_trend():
    df = pd.read_sql("SELECT * FROM students", conn)
    if df.empty:
        return []
    trend = df.groupby("semester")["marks"].mean().reset_index()
    return trend.to_dict(orient="records")

# Student Search
@app.get("/student/{roll}")
def student_search(roll: str):
    df = pd.read_sql("SELECT * FROM students", conn)
    student_df = df[df["roll"].astype(str) == str(roll)]
    if student_df.empty:
        return {"error": f"Student with Roll No {roll} not found in database."}
    
    details = student_df.to_dict(orient="records")
    
    sgpa_all = calculate_sgpa(student_df)
    cgpa_all = calculate_cgpa(sgpa_all)
    
    cgpa_value = cgpa_all["grade"].mean() if not cgpa_all.empty else 0
    
    return {
        "details": details,
        "sgpa": sgpa_all.to_dict(orient="records"),
        "cgpa": cgpa_value
    }


# Student Search Export
@app.get("/student/{roll}/export")
def student_export(roll: str):
    df = pd.read_sql("SELECT * FROM students", conn)
    student_df = df[df["roll"].astype(str) == str(roll)]
    if student_df.empty:
        return {"error": f"Student with Roll No {roll} not found in database."}

    csv_data = student_df.to_csv(index=False)
    return Response(
        content=csv_data, 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename=student_{roll}_marks.csv"}
    )




def generate_pdf_response(df, title, filename):
    html = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Helvetica, Arial, sans-serif; }}
            h2 {{ text-align: center; color: #333; }}
            table {{ border-collapse: collapse; width: 100%; font-size: 12px; }}
            th, td {{ border: 1px solid #ccc; padding: 6px; text-align: center; }}
            th {{ background-color: #f4f4f4; font-weight: bold; }}
            tr:nth-child(even) {{ background-color: #f9f9f9; }}
        </style>
    </head>
    <body>
        <h2>{title}</h2>
        {df.to_html(index=False)}
    </body>
    </html>
    """
    result = BytesIO()
    pisa.pisaDocument(BytesIO(html.encode("UTF-8")), result)
    return Response(
        content=result.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )



# Export Student PDF
@app.get("/student/{roll}/export/pdf")
def student_export_pdf(roll: str):
    df = pd.read_sql("SELECT * FROM students", conn)
    student_df = df[df["roll"].astype(str) == str(roll)]
    if student_df.empty:
        return {"error": f"Student with Roll No {roll} not found in database."}
    return generate_pdf_response(student_df, f"Student Record - Roll {roll}", f"student_{roll}_marks.pdf")


# Enterprise Dashboard API
@app.get("/dashboard-data")
def dashboard_data():
    df = pd.read_sql("SELECT * FROM students", conn)
    if df.empty:
        return {"error": "No data"}
    
    total_students = int(df["roll"].nunique())
    
    sgpa = calculate_sgpa(df)
    cgpa = calculate_cgpa(sgpa)
    avg_cgpa = float(cgpa["grade"].mean()) if not cgpa.empty else 0.0
    
    student_min_marks = df.groupby("roll")["marks"].min()
    pass_count = int((student_min_marks >= 40).sum())
    pass_rate = (pass_count / total_students * 100) if total_students else 0.0
    
    cgpa = cgpa.sort_values(by="grade", ascending=False).reset_index(drop=True)
    cgpa["rank"] = cgpa.index + 1
    cgpa["percentile"] = ((total_students - cgpa["rank"]) / total_students) * 100
    
    top_performer = str(cgpa.iloc[0]["roll"]) if not cgpa.empty else "N/A"
    
    difficulty = df.groupby("subject")["marks"].mean().reset_index()
    difficulty = difficulty.sort_values(by="marks")
    
    low_cgpa_students = cgpa[cgpa["grade"] < 5.0]["roll"].tolist()
    low_avg_subjects = difficulty[difficulty["marks"] < 50.0]["subject"].tolist()
    
    # Get details for names to send back mapping of roll to name
    name_map = df.drop_duplicates(subset=["roll"])[["roll", "name"]].to_dict(orient="records")

    return {
        "kpis": {
            "total_students": total_students,
            "avg_cgpa": round(avg_cgpa, 2),
            "pass_rate": round(pass_rate, 2),
            "top_performer": top_performer
        },
        "alerts": {
            "low_cgpa_count": len(low_cgpa_students),
            "low_cgpa_students": low_cgpa_students,
            "low_avg_subjects": low_avg_subjects
        },
        "difficulty": difficulty.to_dict(orient="records"),
        "ranking": cgpa.to_dict(orient="records"),
        "raw": df.to_dict(orient="records"),
        "students": name_map
    }


# Export Full Class Report PDF
@app.get("/export/full-report/pdf")
def full_export_pdf():
    df = pd.read_sql("SELECT * FROM students", conn)
    if df.empty:
        return {"error": "No data"}
    
    sgpa = calculate_sgpa(df)
    cgpa = calculate_cgpa(sgpa)
    
    # Merge name into CGPA
    cgpa = cgpa.merge(df.drop_duplicates(subset=['roll'])[['roll', 'name']], on='roll', how='left')
    
    total_stu = df['roll'].nunique()
    avg_cgpa = cgpa['grade'].mean()
    student_min_marks = df.groupby("roll")["marks"].min()
    pass_count = (student_min_marks >= 40).sum()
    pass_rate = (pass_count / total_stu * 100) if total_stu else 0
    
    html = f"""
    <html>
    <head>
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; }}
            h1 {{ text-align: center; color: #1a202c; margin-bottom: 5px; }}
            h2 {{ color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-top: 25px; }}
            .kpi-container {{ padding: 20px; background: #ebf4ff; border-radius: 8px; border-left: 5px solid #3182ce; margin-bottom: 20px; }}
            .kpi {{ font-size: 14px; margin-bottom: 8px; }}
            table {{ border-collapse: collapse; width: 100%; font-size: 11px; margin-top: 15px; }}
            th, td {{ border: 1px solid #cbd5e0; padding: 10px; text-align: left; }}
            th {{ background-color: #2b6cb0; color: white; font-weight: bold; text-transform: uppercase; }}
            tr:nth-child(even) {{ background-color: #f7fafc; }}
            .alert {{ color: #c53030; font-weight: bold; }}
        </style>
    </head>
    <body>
        <h1>Enterprise Analytical Report</h1>
        <div class="kpi-container">
            <div class="kpi"><strong>Total Students Recorded:</strong> {total_stu}</div>
            <div class="kpi"><strong>Average Class CGPA:</strong> {round(avg_cgpa, 2)}</div>
            <div class="kpi"><strong>Overall Pass Rate:</strong> {round(pass_rate, 2)}%</div>
        </div>
        
        <h2>Subject Difficulty Index</h2>
        {df.groupby('subject')['marks'].mean().reset_index().rename(columns={{'marks':'Average Score'}}).sort_values('Average Score').round(2).to_html(index=False)}
        
        <h2>Top 15 Scholars Ranking</h2>
        {cgpa.sort_values(by='grade', ascending=False).head(15).rename(columns={{'grade':'CGPA', 'roll': 'Roll No', 'name': 'Name'}}).round(2).to_html(index=False)}
    </body>
    </html>
    """
    result = BytesIO()
    pisa.pisaDocument(BytesIO(html.encode("UTF-8")), result)
    return Response(
        content=result.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=Enterprise_Class_Report.pdf"}
    )

