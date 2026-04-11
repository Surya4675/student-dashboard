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
