// GitHub configuration
const GITHUB_USERNAME = "massd4188-blip";
const REPO_NAME = "my-message-board";

// Global variables
let currentUser = null;
let currentUserData = null;

// ============ HELPER FUNCTIONS ============

// Hash password using SHA-256
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fetch data from GitHub
async function fetchFromGitHub(filePath) {
    const url = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/${filePath}?t=${new Date().getTime()}`;
    try {
        const response = await fetch(url);
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Error fetching from GitHub:', error);
        return null;
    }
}

// Fetch raw text file from GitHub
async function fetchTextFromGitHub(filePath) {
    const url = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/${filePath}?t=${new Date().getTime()}`;
    try {
        const response = await fetch(url);
        if (response.ok) {
            return await response.text();
        }
        return null;
    } catch (error) {
        console.error('Error fetching text:', error);
        return null;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Logout function
function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// ============ INDEX PAGE (LOGIN/REGISTER) ============

if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/my-message-board/')) {
    
    // Tab switching
    window.showTab = function(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(`${tabName}-tab`).classList.add('active');
        event.target.classList.add('active');
    };
    
    // Login function
    window.loginUser = async function() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        if (!username || !password) {
            errorDiv.textContent = 'Please enter username and password!';
            return;
        }
        
        const users = await fetchFromGitHub('users.json');
        if (!users) {
            errorDiv.textContent = 'Cannot connect to server. Please try again.';
            return;
        }
        
        const user = users[username];
        if (!user) {
            errorDiv.textContent = 'Invalid username or password!';
            return;
        }
        
        const hashedPassword = await hashPassword(password);
        if (user.password !== hashedPassword) {
            errorDiv.textContent = 'Invalid username or password!';
            return;
        }
        
        // Store user info
        sessionStorage.setItem('currentUser', JSON.stringify({
            username: username,
            role: user.role
        }));
        
        // Redirect based on role
        if (user.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'client.html';
        }
    };
    
    // Register function (note: only shows message since writing requires Python)
    window.registerUser = async function() {
        document.getElementById('registerError').innerHTML = `
            ⚠️ Registration is done through the Python script.<br>
            Please run: python message_panel.py<br>
            Or ask the admin to create an account for you.
        `;
    };
    
    // Check if already logged in
    const savedUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (savedUser) {
        if (savedUser.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'client.html';
        }
    }
}

// ============ ADMIN PAGE ============

if (window.location.pathname.includes('admin.html')) {
    
    // Check authentication
    const savedUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!savedUser || savedUser.role !== 'admin') {
        // Not logged in as admin, redirect to login
        window.location.href = 'index.html';
    }
    
    // Display admin name
    document.getElementById('adminName').textContent = savedUser.username;
    
    // Load admin data
    loadAdminData();
    
    async function loadAdminData() {
        const users = await fetchFromGitHub('users.json');
        if (!users) {
            document.getElementById('userList').innerHTML = '<div class="error">Error loading users</div>';
            return;
        }
        
        // Calculate stats
        const userList = Object.keys(users).filter(u => u !== 'admin');
        document.getElementById('totalUsers').textContent = userList.length;
        
        // Count total messages (simplified)
        let totalMessages = 0;
        for (const username of userList) {
            const messages = await fetchTextFromGitHub(`messages/${username}_messages.txt`);
            if (messages) {
                totalMessages += messages.split('\n').filter(l => l.trim()).length;
            }
        }
        document.getElementById('totalMessages').textContent = totalMessages;
        
        // Create user list
        if (userList.length === 0) {
            document.getElementById('userList').innerHTML = '<p>No users registered yet.</p>';
        } else {
            document.getElementById('userList').innerHTML = userList.map(username => `
                <div class="user-card">
                    <strong>${escapeHtml(username)}</strong>
                    <div class="user-stats">
                        Messages: ${users[username].messages_left || 0}/10 left
                    </div>
                    <button onclick="viewUserMessages('${username}')" class="btn-user">View Messages</button>
                    <button onclick="resetUserMessages('${username}')" class="btn-reset">Reset</button>
                </div>
            `).join('');
        }
    }
    
    // View user messages
    window.viewUserMessages = async function(username) {
        document.getElementById('modalUsername').textContent = username;
        const messagesList = document.getElementById('userMessages');
        messagesList.innerHTML = '<div class="loading">Loading messages...</div>';
        
        const messages = await fetchTextFromGitHub(`messages/${username}_messages.txt`);
        
        if (!messages) {
            messagesList.innerHTML = '<div class="message">No messages from this user yet.</div>';
        } else {
            const lines = messages.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
                messagesList.innerHTML = '<div class="message">No messages from this user yet.</div>';
            } else {
                messagesList.innerHTML = lines.map(line => {
                    const match = line.match(/\[(.*?)\]\s*(.*)/);
                    if (match) {
                        return `
                            <div class="message">
                                <div class="timestamp">📅 ${match[1]}</div>
                                <div class="text">${escapeHtml(match[2])}</div>
                            </div>
                        `;
                    }
                    return `<div class="message"><div class="text">${escapeHtml(line)}</div></div>`;
                }).join('');
            }
        }
        
        document.getElementById('userModal').style.display = 'block';
    };
    
    // Reset user messages (note: requires Python script for actual update)
    window.resetUserMessages = function(username) {
        alert(`To reset ${username}'s messages, please use the Python script.\n\nAdmin can also do this from the admin panel in the Python script.`);
    };
    
    // Reset all users
    window.resetAllUsers = function() {
        alert('To reset all users, please use the Python script admin panel.');
    };
    
    // Close modal
    window.closeModal = function() {
        document.getElementById('userModal').style.display = 'none';
    };
    
    // Refresh data every 10 seconds
    setInterval(loadAdminData, 10000);
}

// ============ CLIENT PAGE ============

if (window.location.pathname.includes('client.html')) {
    
    // Check authentication
    const savedUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!savedUser || savedUser.role !== 'client') {
        window.location.href = 'index.html';
    }
    
    // Display client name
    document.getElementById('clientName').textContent = savedUser.username;
    
    // Load client data
    loadClientData();
    
    async function loadClientData() {
        const users = await fetchFromGitHub('users.json');
        if (!users || !users[savedUser.username]) {
            return;
        }
        
        const user = users[savedUser.username];
        const messagesLeft = user.messages_left || 0;
        
        // Update counter
        document.getElementById('messagesLeft').textContent = messagesLeft;
        const fillPercent = (messagesLeft / 10) * 100;
        document.getElementById('counterFill').style.width = `${fillPercent}%`;
        
        // Disable send button if no messages left
        const sendBtn = document.getElementById('sendBtn');
        if (messagesLeft <= 0) {
            sendBtn.disabled = true;
            sendBtn.textContent = 'No Messages Left';
        } else {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Message';
        }
        
        // Load message history
        const messages = await fetchTextFromGitHub(`messages/${savedUser.username}_messages.txt`);
        const messageHistory = document.getElementById('messageHistory');
        
        if (!messages) {
            messageHistory.innerHTML = '<div class="message">No messages yet. Send your first message!</div>';
            return;
        }
        
        const lines = messages.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
            messageHistory.innerHTML = '<div class="message">No messages yet. Send your first message!</div>';
        } else {
            messageHistory.innerHTML = lines.map(line => {
                const match = line.match(/\[(.*?)\]\s*(.*)/);
                if (match) {
                    return `
                        <div class="message">
                            <div class="timestamp">📅 ${match[1]}</div>
                            <div class="text">${escapeHtml(match[2])}</div>
                        </div>
                    `;
                }
                return `<div class="message"><div class="text">${escapeHtml(line)}</div></div>`;
            }).join('');
        }
    }
    
    // Send message (shows instructions since writing requires Python)
    window.sendMessage = function() {
        document.getElementById('messageError').innerHTML = `
            ⚠️ To send messages, please use the Python script:<br>
            Run: python message_panel.py<br>
            Then login with your username and password.
        `;
    };
    
    // Auto-refresh every 10 seconds
    setInterval(loadClientData, 10000);
}
