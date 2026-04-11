import pandas as pd

def get_grade(mark):
    if mark >= 90:
        return 10
    elif mark >= 80:
        return 9
    elif mark >= 70:
        return 8
    elif mark >= 60:
        return 7
    elif mark >= 50:
        return 6
    elif mark >= 40:
        return 5
    else:
        return 0


def calculate_sgpa(df):
    df["grade"] = df["marks"].apply(get_grade)

    sgpa = df.groupby(["roll", "semester"])["grade"].mean().reset_index()

    return sgpa


def calculate_cgpa(sgpa_df):
    cgpa = sgpa_df.groupby("roll")["grade"].mean().reset_index()

    return cgpa
