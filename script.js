// GitHub configuration
const GITHUB_USERNAME = "massd4188-blip";
const REPO_NAME = "my-message-board";
const USERS_FILE = "users.json";

// Global variables
let currentUser = null;
let currentUserData = null;

// API Functions to read from GitHub
async function fetchFromGitHub(filePath) {
    const url = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/${filePath}`;
    try {
        const response = await fetch(url + '?t=' + new Date().getTime()); // Prevent cache
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Error fetching from GitHub:', error);
        return null;
    }
}

// Hash password
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Login user (reads from GitHub)
async function loginUser(username, password) {
    const users = await fetchFromGitHub(USERS_FILE);
    if (!users) {
        document.getElementById('loginError').textContent = 'Cannot connect to server. Please try again.';
        return false;
    }
    
    const user = users[username];
    if (!user) {
        document.getElementById('loginError').textContent = 'Invalid username or password!';
        return false;
    }
    
    const hashedPassword = await hashPassword(password);
    if (user.password !== hashedPassword) {
        document.getElementById('loginError').textContent = 'Invalid username or password!';
        return false;
    }
    
    currentUser = username;
    currentUserData = user;
    sessionStorage.setItem('currentUser', JSON.stringify({username, role: user.role}));
    
    if (user.role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'client.html';
    }
    return true;
}

// Register user (stores locally, needs manual approval or we'll just use Python registration)
async function registerUser(username, password, confirmPassword, dob) {
    if (password !== confirmPassword) {
        document.getElementById('registerError').textContent = 'Passwords do not match!';
        return false;
    }
    
    if (username.length < 3 || username.length > 20) {
        document.getElementById('registerError').textContent = 'Username must be 3-20 characters!';
        return false;
    }
    
    if (password.length < 6) {
        document.getElementById('registerError').textContent = 'Password must be at least 6 characters!';
        return false;
    }
    
    // Since we can't write to GitHub from client-side JavaScript,
    // we'll show a message to register via Python
    document.getElementById('registerError').innerHTML = `
        ⚠️ Registration is done through the Python script.<br>
        Please run: python message_panel.py<br>
        Or ask the admin to create an account for you.
    `;
    return false;
}

// Show/Hide tabs
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');
}

// Event Listeners
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    await loginUser(username, password);
});

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const dob = document.getElementById('regDob').value;
    await registerUser(username, password, confirmPassword, dob);
});

// Logout function
function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Load messages for client
async function loadClientMessages(username) {
    const url = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/messages/${username}_messages.txt?t=${new Date().getTime()}`;
    try {
        const response = await fetch(url);
        if (response.ok) {
            const text = await response.text();
            return text;
        }
        return null;
    } catch (error) {
        console.error('Error loading messages:', error);
        return null;
    }
}

// Client Dashboard
if (window.location.pathname.includes('client.html')) {
    const savedUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!savedUser || savedUser.role !== 'client') {
        window.location.href = 'index.html';
    }
    
    document.getElementById('clientName').textContent = savedUser.username;
    loadClientDashboard();
    
    async function loadClientDashboard() {
        // Get user data from GitHub
        const users = await fetchFromGitHub(USERS_FILE);
        const user = users[savedUser.username];
        
        if (user) {
            document.getElementById('messagesLeft').textContent = user.messages_left;
            const fillPercent = (user.messages_left / 10) * 100;
            document.getElementById('counterFill').style.width = `${fillPercent}%`;
            
            if (user.messages_left <= 0) {
                document.getElementById('sendBtn').disabled = true;
                document.getElementById('sendBtn').textContent = 'No Messages Left';
            }
        }
        
        // Load message history
        const messages = await loadClientMessages(savedUser.username);
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
    
    // Note: Sending messages requires the Python script
    document.getElementById('messageForm').addEventListener('submit', (e) => {
        e.preventDefault();
        document.getElementById('messageError').innerHTML = `
            ⚠️ To send messages, please use the Python script:<br>
            Run: python message_panel.py<br>
            Then login with your username and password.
        `;
    });
    
    // Auto-refresh every 10 seconds
    setInterval(loadClientDashboard, 10000);
}

// Admin Dashboard
if (window.location.pathname.includes('admin.html')) {
    const savedUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!savedUser || savedUser.role !== 'admin') {
        window.location.href = 'index.html';
    }
    
    document.getElementById('adminName').textContent = savedUser.username;
    loadAdminData();
    
    async function loadAdminData() {
        const users = await fetchFromGitHub(USERS_FILE);
        if (!users) return;
        
        const totalUsers = Object.keys(users).filter(u => u !== 'admin').length;
        document.getElementById('totalUsers').textContent = totalUsers;
        
        // Calculate total messages (this would require loading all message files - simplified)
        document.getElementById('totalMessages').textContent = 'View details';
        
        const userList = document.getElementById('userList');
        const userButtons = Object.keys(users)
            .filter(username => username !== 'admin')
            .map(username => `<button class="btn-user" onclick="viewUserMessages('${username}')">${username}</button>`)
            .join('');
        
        userList.innerHTML = userButtons || '<p>No users yet</p>';
    }
    
    window.viewUserMessages = async function(username) {
        document.getElementById('modalUsername').textContent = username;
        const messagesList = document.getElementById('userMessages');
        
        const url = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/messages/${username}_messages.txt?t=${new Date().getTime()}`;
        try {
            const response = await fetch(url);
            if (response.ok) {
                const text = await response.text();
                const lines = text.split('\n').filter(line => line.trim());
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
            } else {
                messagesList.innerHTML = '<div class="message">No messages from this user yet.</div>';
            }
        } catch (error) {
            messagesList.innerHTML = '<div class="message">Error loading messages.</div>';
        }
        
        document.getElementById('userModal').style.display = 'block';
    };
    
    window.closeModal = function() {
        document.getElementById('userModal').style.display = 'none';
    };
    
    setInterval(loadAdminData, 10000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
