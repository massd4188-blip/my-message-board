// GitHub configuration - REPLACE WITH YOUR INFO
const GITHUB_USERNAME = 'massd4188-blip';
const GITHUB_REPO = 'my-message-board';
const DATA_FILE = 'data.txt';

async function fetchScans() {
    try {
        const url = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/${DATA_FILE}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch data');
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
        if (line.trim()) {
            const [timestamp, uid] = line.split(',');
            if (uid) {
                scans.push({ timestamp: timestamp || 'Unknown', uid: uid.trim() });
            }
        }
    }
    
    // Update stats
    document.getElementById('totalScans').textContent = scans.length;
    
    if (scans.length > 0) {
        document.getElementById('lastScan').textContent = scans[scans.length - 1].uid;
    }
    
    // Display in table (show last 50)
    const tableBody = document.getElementById('scanTableBody');
    const recentScans = scans.reverse().slice(0, 50);
    
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
