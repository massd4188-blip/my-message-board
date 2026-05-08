// script.js - Place in your GitHub repository
const GITHUB_USERNAME = 'massd4188-blip';
const GITHUB_REPO = 'my-message-board';
const DATA_FILE = 'data.txt';

async function fetchScans() {
    try {
        // Use the raw GitHub URL for the file
        const url = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/${DATA_FILE}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const text = await response.text();
        parseAndDisplayData(text);
        
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('scanTableBody').innerHTML = 
            '<tr><td colspan="2">Error loading data. Make sure data.txt exists.</td></tr>';
    }
}

function parseAndDisplayData(data) {
    const lines = data.trim().split('\n');
    const scans = [];
    
    for (const line of lines) {
        // Skip comment lines (starting with #)
        if (line.startsWith('#')) continue;
        
        if (line.trim()) {
            const parts = line.split(',');
            if (parts.length >= 2) {
                scans.push({ 
                    timestamp: parts[0], 
                    uid: parts.slice(1).join(',') 
                });
            } else if (parts.length == 1) {
                scans.push({ 
                    timestamp: 'Unknown', 
                    uid: parts[0] 
                });
            }
        }
    }
    
    document.getElementById('totalScans').textContent = scans.length;
    
    if (scans.length > 0) {
        document.getElementById('lastScan').textContent = scans[scans.length - 1].uid;
    }
    
    const tableBody = document.getElementById('scanTableBody');
    const recentScans = [...scans].reverse().slice(0, 50);
    
    if (recentScans.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="2">No scans recorded yet</td></tr>';
        return;
    }
    
    tableBody.innerHTML = recentScans.map(scan => `
        <tr>
            <td>${scan.timestamp}</td>
            <td><code>${scan.uid}</code></td>
        </tr>
    `).join('');
}

// Auto-refresh every 10 seconds
fetchScans();
setInterval(fetchScans, 10000);
