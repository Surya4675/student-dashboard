let dashboardData = null;
let charts = {}; // Store chart instances to destroy them before updating

const THEME_KEY = "enterprise_dashboard_theme";

// Theme Toggling
document.getElementById('themeToggleBtn').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    updateChartsTheme();
});

// Load theme on start
if (localStorage.getItem(THEME_KEY) === 'dark') {
    document.body.classList.add('dark-mode');
}

// Global defaults for ChartJS
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = "#64748b";

async function fetchDashboardData() {
    try {
        let res = await fetch(API_BASE_URL + "/dashboard-data");
        dashboardData = await res.json();
        
        if(dashboardData.error){
            console.error("No data found");
            return;
        }

        populateFilters();
        applyFilters(); // Renders everything initially
        renderKPIs();
        renderAlerts();
        renderRanking();
        renderDifficulty();
        populateCompareSelects();

    } catch (e) {
        console.error("Error fetching data:", e);
    }
}

function renderKPIs() {
    document.getElementById("kpiTotalStudents").innerText = dashboardData.kpis.total_students;
    document.getElementById("kpiAvgCgpa").innerText = dashboardData.kpis.avg_cgpa;
    document.getElementById("kpiPassRate").innerText = dashboardData.kpis.pass_rate + "%";
    document.getElementById("kpiTopPerformer").innerText = dashboardData.kpis.top_performer;
}

function renderAlerts() {
    const container = document.getElementById("alertsContainer");
    container.innerHTML = "";
    
    if (dashboardData.alerts.low_cgpa_count > 0) {
        container.innerHTML += `
            <div class="alert-banner alert-danger">
                <i class="fas fa-exclamation-triangle"></i>
                Risk Alert: ${dashboardData.alerts.low_cgpa_count} students critically below 5.0 CGPA baseline. Immediate intervention recommended.
            </div>
        `;
    }
    
    if (dashboardData.alerts.low_avg_subjects.length > 0) {
        container.innerHTML += `
            <div class="alert-banner alert-warning">
                <i class="fas fa-info-circle"></i>
                Academic Alert: Subjects experiencing low performance (< 50 avg): ${dashboardData.alerts.low_avg_subjects.join(", ")}.
            </div>
        `;
    }
}

function renderRanking() {
    const tbody = document.getElementById("rankingBody");
    tbody.innerHTML = "";
    // Show top 10 or all if less
    dashboardData.ranking.slice(0, 10).forEach(r => {
        let pct = r.percentile.toFixed(1);
        let badgeClass = pct >= 90 ? "badge-top" : "";
        let text = pct >= 90 ? `Top ${100 - Math.floor(pct)}%` : `${pct}%`;
        
        // Fix for rank 1 exactly 100
        if(pct == 100) text = "Top 1%";

        let badge = `<span class="badge ${badgeClass}" style="${badgeClass ? '' : 'background: rgba(0,0,0,0.05); color: var(--text-muted);'}">${text}</span>`;
        tbody.innerHTML += `
            <tr>
                <td><strong>#${r.rank}</strong></td>
                <td>${r.roll}</td>
                <td><strong>${r.grade.toFixed(2)}</strong></td>
                <td>${badge}</td>
            </tr>
        `;
    });
}

function renderDifficulty() {
    const list = document.getElementById("difficultyList");
    list.innerHTML = "";
    dashboardData.difficulty.forEach(d => {
        let diffClass = "diff-easy";
        if (d.marks < 60) diffClass = "diff-medium";
        if (d.marks < 50) diffClass = "diff-hard";
        
        list.innerHTML += `
            <div class="diff-item ${diffClass}">
                <span class="subject">${d.subject}</span>
                <span class="score">Avg: ${d.marks.toFixed(1)}</span>
            </div>
        `;
    });
}

function populateFilters() {
    const semFilter = document.getElementById("semFilter");
    const subFilter = document.getElementById("subFilter");
    const stuFilter = document.getElementById("studentFilter");
    
    // Unique semesters
    let sems = [...new Set(dashboardData.raw.map(d => d.semester))].sort();
    sems.forEach(s => semFilter.innerHTML += `<option value="${s}">Semester ${s}</option>`);
    
    // Unique subjects
    let subs = [...new Set(dashboardData.raw.map(d => d.subject))].sort();
    subs.forEach(s => subFilter.innerHTML += `<option value="${s}">${s}</option>`);

    // Unique students
    let students = dashboardData.students;
    students.forEach(s => stuFilter.innerHTML += `<option value="${s.roll}">${s.name} (${s.roll})</option>`);
}

function populateCompareSelects() {
    const selectA = document.getElementById("compareStudentA");
    const selectB = document.getElementById("compareStudentB");
    
    selectA.innerHTML = '<option value="">Select Student A</option>';
    selectB.innerHTML = '<option value="">Select Student B</option>';
    
    dashboardData.students.forEach(s => {
        let opt = `<option value="${s.roll}">${s.name} (${s.roll})</option>`;
        selectA.innerHTML += opt;
        selectB.innerHTML += opt;
    });
}

function applyFilters() {
    let sem = document.getElementById("semFilter").value;
    let sub = document.getElementById("subFilter").value;
    let stu = document.getElementById("studentFilter").value;
    
    let filtered = dashboardData.raw.filter(d => {
        let mSem = sem === "all" || d.semester == sem;
        let mSub = sub === "all" || d.subject == sub;
        let mStu = stu === "all" || d.roll == stu;
        return mSem && mSub && mStu;
    });
    
    renderCharts(filtered);
}

function resetFilters() {
    document.getElementById("semFilter").value = "all";
    document.getElementById("subFilter").value = "all";
    document.getElementById("studentFilter").value = "all";
    applyFilters();
}

function renderCharts(data) {
    if(!data || data.length === 0) return;

    renderSubjectChart(data);
    renderTrendChart(data);
    renderPassFailChart(data);
}

function destroyChart(name) {
    if(charts[name]) {
        charts[name].destroy();
    }
}

const getThemeColors = () => {
    return document.body.classList.contains('dark-mode') ? 
    { text: '#94a3b8', grid: '#334155' } : 
    { text: '#64748b', grid: '#e2e8f0' };
};

function renderSubjectChart(data) {
    destroyChart('subject');
    
    // Group by subject
    let subjects = {};
    data.forEach(d => {
        if(!subjects[d.subject]) subjects[d.subject] = [];
        subjects[d.subject].push(d.marks);
    });
    
    let labels = Object.keys(subjects);
    let means = labels.map(l => {
        let arr = subjects[l];
        return (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1);
    });

    let colors = getThemeColors();
    
    // Dynamic bar colors based on average
    let bgColors = means.map(m => {
        if(m >= 70) return 'rgba(16, 185, 129, 0.8)'; // Green
        if(m >= 50) return 'rgba(245, 158, 11, 0.8)'; // Orange
        return 'rgba(239, 68, 68, 0.8)'; // Red
    });

    const ctx = document.getElementById('subjectChart').getContext('2d');
    charts['subject'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Score',
                data: means,
                backgroundColor: bgColors,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: colors.grid }, ticks:{ color: colors.text } },
                x: { grid: { display: false }, ticks:{ color: colors.text } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { 
                    mode: 'index', 
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let val = context.raw;
                            let status = val >= 70 ? '(Excellent)' : (val >= 50 ? '(Average)' : '(Needs Attention)');
                            return `Avg Score: ${val} ${status}`;
                        }
                    }
                }
            }
        }
    });
}

function renderTrendChart(data) {
    destroyChart('trend');
    
    let sems = {};
    data.forEach(d => {
        if(!sems[d.semester]) sems[d.semester] = [];
        sems[d.semester].push(d.marks);
    });
    
    let labels = Object.keys(sems).sort();
    let means = labels.map(l => {
        let arr = sems[l];
        return (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1);
    });

    let colors = getThemeColors();

    const ctx = document.getElementById('trendChart').getContext('2d');
    charts['trend'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(l => "Sem " + l),
            datasets: [{
                label: 'Semester Overall Avg',
                data: means,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: '#10b981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: colors.grid }, ticks:{ color: colors.text }  },
                x: { grid: { display: false }, ticks:{ color: colors.text }  }
            },
            plugins: {
                legend: { display: false },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}

function renderPassFailChart(data) {
    destroyChart('passfail');
    
    // Evaluate Pass/fail based on min marks for students in THIS filtered data
    let studentMins = {};
    data.forEach(d => {
        if(!studentMins[d.roll] || d.marks < studentMins[d.roll]) {
            studentMins[d.roll] = d.marks;
        }
    });
    
    let pass = 0, fail = 0;
    window.failedRolls = [];
    window.passedRolls = [];
    Object.keys(studentMins).forEach(roll => {
        let m = studentMins[roll];
        if(m >= 40) {
            pass++;
            window.passedRolls.push(roll);
        } else {
            fail++;
            window.failedRolls.push(roll);
        }
    });

    // Destroy old chart if it exists
    destroyChart('passfail');

    let total = pass + fail;
    let passPct = total > 0 ? ((pass / total) * 100).toFixed(1) : 0;
    let failPct = total > 0 ? ((fail / total) * 100).toFixed(1) : 0;

    let container = document.getElementById('interactivePfContainer');
    container.innerHTML = `
        <div class="pf-interactive">
            <div class="pf-stats">
                <div class="pf-card pf-card-pass" onclick="showStudentList(true)">
                    <h4>Successful Scholars</h4>
                    <h2>${pass}</h2>
                    <span style="font-size:12px; opacity:0.8;">${passPct}% of cohort</span>
                </div>
                <div class="pf-card pf-card-fail" onclick="showStudentList(false)">
                    <h4>Critical Action Required</h4>
                    <h2>${fail}</h2>
                    <span style="font-size:12px; opacity:0.8;">${failPct}% of cohort</span>
                </div>
            </div>
            
            <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); font-weight: 700;">Distribution Scale</p>
            <div class="pf-bar-container">
                <div class="pf-bar-pass" style="width: ${passPct}%;">${passPct}%</div>
                <div class="pf-bar-fail" style="width: ${failPct}%;">${failPct}%</div>
            </div>
        </div>
    `;
}

window.showStudentList = function(isPass) {
    let rolls = isPass ? window.passedRolls : window.failedRolls;
    let title = isPass ? "Successful Scholars" : "Failed Students Action List";
    let icon = isPass ? "fa-check-circle" : "fa-exclamation-circle";
    let color = isPass ? "#10b981" : "#991b1b";
    
    let listHtml = rolls.map(r => {
        let name = dashboardData.students.find(s=>s.roll == r)?.name || "Unknown";
        return `<div style="padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05); display:flex; justify-content:space-between;">
                    <span>${name}</span>
                    <strong>${r}</strong>
                </div>`;
    }).join("");
    
    if(rolls.length === 0) listHtml = `<div style="padding: 10px 0;">No students fall into this category within the current logical filters.</div>`;
    
    document.getElementById("failedStudentList").innerHTML = listHtml;
    
    // Update Popup Header UI
    let detailsBox = document.getElementById("passFailDetails");
    detailsBox.className = isPass ? "alert-banner alert-danger" : "alert-banner alert-warning"; 
    // We override styles inline since JS is dynamically building this popup
    detailsBox.style.borderLeft = `4px solid ${color}`;
    detailsBox.style.backgroundColor = "var(--card-bg)";
    
    let header = detailsBox.querySelector('h4');
    header.style.color = color;
    header.innerHTML = `<i class="fas ${icon}"></i> ${title}`;
    
    let closeBtn = detailsBox.querySelector('.btn-text');
    closeBtn.style.color = color;
    
    detailsBox.style.display = "block";
}

function switchTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    // Un-highlight buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    // Show selected
    document.getElementById(tabId).classList.add('active');
    // Highlight button
    event.currentTarget.classList.add('active');
}

function toggleCompareSidebar() {
    const sidebar = document.getElementById('compareSidebar');
    sidebar.classList.toggle('open');
}

function getGrade(mark) {
    if(mark >= 90) return 10;
    if(mark >= 80) return 9;
    if(mark >= 70) return 8;
    if(mark >= 60) return 7;
    if(mark >= 50) return 6;
    if(mark >= 40) return 5;
    return 0;
}

function calculateDynamicSgpa(records) {
    let sems = {};
    records.forEach(r => {
        if(!sems[r.semester]) sems[r.semester] = [];
        sems[r.semester].push(getGrade(r.marks));
    });
    let sgpa = {};
    Object.keys(sems).forEach(sem => {
        let grades = sems[sem];
        sgpa[sem] = grades.length ? (grades.reduce((a,b)=>a+b, 0) / grades.length) : 0;
    });
    return sgpa;
}

function compareStudents() {
    const rollA = document.getElementById("compareStudentA").value;
    const rollB = document.getElementById("compareStudentB").value;
    
    if(!rollA || !rollB) {
        alert("Please select both students to compare.");
        return;
    }
    
    const cgpaDataA = dashboardData.ranking.find(r => r.roll == rollA);
    const cgpaDataB = dashboardData.ranking.find(r => r.roll == rollB);
    
    const nameA = dashboardData.students.find(s=>s.roll == rollA).name;
    const nameB = dashboardData.students.find(s=>s.roll == rollB).name;
    
    document.getElementById("compNameA").innerText = nameA;
    document.getElementById("compCgpaA").innerText = cgpaDataA ? cgpaDataA.grade.toFixed(2) : "N/A";
    
    document.getElementById("compNameB").innerText = nameB;
    document.getElementById("compCgpaB").innerText = cgpaDataB ? cgpaDataB.grade.toFixed(2) : "N/A";
    
    document.getElementById("compareResults").style.display = "block";
    
    // Gather subject data for both
    const recordsA = dashboardData.raw.filter(d => d.roll == rollA);
    const recordsB = dashboardData.raw.filter(d => d.roll == rollB);
    
    // Calculate SGPA per sem
    let sgpaA = calculateDynamicSgpa(recordsA);
    let sgpaB = calculateDynamicSgpa(recordsB);
    let allSems = [...new Set([...Object.keys(sgpaA), ...Object.keys(sgpaB)])].sort();
    
    let sgpaBody = document.getElementById("sgpaCompareBody");
    sgpaBody.innerHTML = "";
    allSems.forEach(sem => {
        let valA = sgpaA[sem] !== undefined ? sgpaA[sem].toFixed(2) : "-";
        let valB = sgpaB[sem] !== undefined ? sgpaB[sem].toFixed(2) : "-";
        
        let displayA = valA;
        let displayB = valB;

        if(valA !== "-" && valB !== "-" && valA !== valB) {
            if(parseFloat(valA) > parseFloat(valB)) {
                displayA = `${valA} <i class="fas fa-trophy" style="color:#f59e0b; margin-left:5px;" title="Highest"></i>`;
            } else {
                displayB = `${valB} <i class="fas fa-trophy" style="color:#f59e0b; margin-left:5px;" title="Highest"></i>`;
            }
        }

        sgpaBody.innerHTML += `
            <tr>
                <td><strong>Sem ${sem}</strong></td>
                <td>${displayA}</td>
                <td>${displayB}</td>
            </tr>
        `;
    });

    // Collect all unique subjects between them
    let allSubs = [...new Set([...recordsA.map(r=>r.subject), ...recordsB.map(r=>r.subject)])];
    
    let marksA = allSubs.map(sub => {
        let rec = recordsA.find(r=>r.subject == sub);
        return rec ? rec.marks : 0;
    });
    
    let marksB = allSubs.map(sub => {
        let rec = recordsB.find(r=>r.subject == sub);
        return rec ? rec.marks : 0;
    });

    destroyChart('compare');
    let colors = getThemeColors();
    const ctx = document.getElementById('compareChart').getContext('2d');
    charts['compare'] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: allSubs,
            datasets: [
                {
                    label: nameA,
                    data: marksA,
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    borderColor: '#2563eb',
                    pointBackgroundColor: '#2563eb'
                },
                {
                    label: nameB,
                    data: marksB,
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderColor: '#ef4444',
                    pointBackgroundColor: '#ef4444'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: colors.grid },
                    grid: { color: colors.grid },
                    pointLabels: { color: colors.text, font: {size: 11} },
                    ticks: { display: false }
                }
            },
            plugins: {
                legend: { position: 'top', labels:{ color: colors.text } }
            }
        }
    });

}

function updateChartsTheme() {
    if(!dashboardData) return;
    let colors = getThemeColors();
    
    ['subject', 'trend'].forEach(c => {
        if(charts[c]) {
            charts[c].options.scales.x.ticks.color = colors.text;
            charts[c].options.scales.y.ticks.color = colors.text;
            charts[c].options.scales.y.grid.color = colors.grid;
            charts[c].update();
        }
    });
    
    if(charts['passfail']) {
        charts['passfail'].options.plugins.legend.labels.color = colors.text;
        charts['passfail'].update();
    }
    
    if(charts['compare']) {
        charts['compare'].options.scales.r.angleLines.color = colors.grid;
        charts['compare'].options.scales.r.grid.color = colors.grid;
        charts['compare'].options.scales.r.pointLabels.color = colors.text;
        charts['compare'].options.plugins.legend.labels.color = colors.text;
        charts['compare'].update();
    }
}

// Initial fetch
fetchDashboardData();
