async function loadDashboard() {
    loadSubjects();
    loadTrend();
    loadPassFail();
    loadToppers();
}

async function loadSubjects() {
    let res = await fetch("http://127.0.0.1:8000/subjects");
    let data = await res.json();
    let ctx = document.getElementById("subjectChart");
    new Chart(ctx, {
        type: "bar",
        data: {
            labels: data.map(d => d.subject),
            datasets: [
                { label: "Average Marks", data: data.map(d => d.mean), backgroundColor: '#007bff' },
                { label: "Highest Marks", data: data.map(d => d.max), backgroundColor: '#28a745' },
                { label: "Lowest Marks", data: data.map(d => d.min), backgroundColor: '#dc3545' }
            ]
        }
    });
}

async function loadTrend() {
    let res = await fetch("http://127.0.0.1:8000/trend");
    let data = await res.json();
    let ctx = document.getElementById("trendChart");
    new Chart(ctx, {
        type: "line",
        data: {
            labels: data.map(d => "Sem " + d.semester),
            datasets: [{ label: "Average Performance", data: data.map(d => d.marks), borderColor: '#e83e8c', backgroundColor: 'rgba(232, 62, 140, 0.2)', fill: true, tension: 0.3 }]
        }
    });
}

async function loadPassFail() {
    let res = await fetch("http://127.0.0.1:8000/passfail");
    let data = await res.json();
    let ctx = document.getElementById("passFailChart");
    new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["Pass", "Fail"],
            datasets: [{ data: [data.Pass || 0, data.Fail || 0], backgroundColor: ['#28a745', '#dc3545'] }]
        }
    });
}

async function loadToppers() {
    let res = await fetch("http://127.0.0.1:8000/toppers");
    let data = await res.json();
    let tbody = document.getElementById("topperBody");
    tbody.innerHTML = "";
    data.forEach(t => {
        tbody.innerHTML += `<tr><td>${t.roll}</td><td>${t.grade.toFixed(2)}</td></tr>`;
    });
}

async function searchStudent() {
    let roll = document.getElementById("searchInput").value;
    if(!roll) return;
    
    let res = await fetch(`http://127.0.0.1:8000/student/${roll}`);
    let data = await res.json();
    let resultsDiv = document.getElementById("searchResults");
    
    if(data.error) {
        resultsDiv.innerHTML = `<div class='error-msg'>${data.error}</div>`;
    } else {
        let name = data.details[0].name;

        // Create SGPA Table Rows
        let sgpaTableRows = data.sgpa.map(s => `
            <tr>
                <td>Semester ${s.semester}</td>
                <td><strong>${s.grade.toFixed(2)}</strong></td>
            </tr>
        `).join('');
        
        // Group detailed marks by semester
        let marksBySem = {};
        data.details.forEach(d => {
            if(!marksBySem[d.semester]) marksBySem[d.semester] = [];
            
            // Only add if subject doesn't exist yet to prevent DB duplicate renders
            if(!marksBySem[d.semester].some(entry => entry.subject === d.subject)){
                marksBySem[d.semester].push(d);
            }
        });

        let groupedMarksHTML = "";
        for(let sem in marksBySem) {
            groupedMarksHTML += `
                <div style="margin-bottom: 20px;">
                    <h5 style="margin: 0 0 8px 0; color: #007bff; border-bottom: 2px solid #eee; padding-bottom: 5px; font-size: 1.05em;">Semester ${sem}</h5>
                    <ul style="list-style: none; padding-left: 5px; margin: 0; font-size: 0.95em;">
                        ${marksBySem[sem].map(m => `<li style="margin-bottom:4px;">${m.subject} : <strong style="float:right;">${m.marks} %</strong></li>`).join('')}
                    </ul>
                </div>
            `;
        }

        resultsDiv.innerHTML = `
            <div style="background: #f8f9fa; padding: 15px 20px; border-radius: 8px; border-left: 5px solid #007bff; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0;">Student: ${name} (Roll: ${roll})</h3>
                <h3 style="margin: 0;">CGPA: <span style="background: #28a745; color: white; padding: 5px 10px; border-radius: 5px;">${data.cgpa.toFixed(2)}</span></h3>
            </div>
            
            <div style="display: flex; gap: 40px; margin-top: 25px; text-align: left;">
                
                <!-- SGPA Table -->
                <div style="flex: 1;">
                    <h4 style="border-bottom: 2px solid #ccc; padding-bottom: 8px; margin-top:0;">Semester-wise SGPA</h4>
                    <table class="styled-table" style="width: 100%;">
                        <thead><tr><th>Semester</th><th>Calculated SGPA</th></tr></thead>
                        <tbody>${sgpaTableRows}</tbody>
                    </table>
                </div>

                <!-- Detailed Marks Table -->
                <div style="flex: 1;">
                    <h4 style="border-bottom: 2px solid #ccc; padding-bottom: 8px; margin-top:0;">Detailed Subject Marks</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                        ${groupedMarksHTML}
                    </div>
                </div>

            </div>
        `;
    }
    resultsDiv.style.display = "block";
}

// Start loading
loadDashboard();
