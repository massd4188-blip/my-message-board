// Global variables
let currentUser = null;
let currentUserData = null;

// API Functions
async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(endpoint, options);
    return await response.json();
}

// Hash password (simple SHA-256 simulation - in production use crypto)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

// Register user
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const dob = document.getElementById('regDob').value;
    
    if (password !== confirmPassword) {
        document.getElementById('registerError').textContent = 'Passwords do not match!';
        return;
    }
    
    const hashedPassword = await hashPassword(password);
    
    // Get existing users
    let users = JSON.parse(localStorage.getItem('users') || '{}');
    
    if (users[username]) {
        document.getElementById('registerError').textContent = 'Username already exists!';
        return;
    }
    
    // Create new user
    users[username] = {
        password: hashedPassword,
        role: 'client',
        created: new Date().toISOString(),
        messages_left: 10,
        dob: dob,
        messages: []
    };
    
    localStorage.setItem('users', JSON.stringify(users));
    
    document.getElementById('registerSuccess').textContent = 'Registration successful! You can now login.';
    document.getElementById('registerForm').reset();
    setTimeout(() => {
        showTab('login');
    }, 2000);
});

// Login user
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const hashedPassword = await hashPassword(password);
    
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const user = users[username];
    
    if (!user || user.password !== hashedPassword) {
        document.getElementById('loginError').textContent = 'Invalid username or password!';
        return;
    }
    
    currentUser = username;
    currentUserData = user;
    localStorage.setItem('currentUser', JSON.stringify({username, role: user.role}));
    
    if (user.role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'client.html';
    }
});

// Logout function
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Client Dashboard Functions
if (window.location.pathname.includes('client.html')) {
    // Load client data
    const savedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!savedUser || savedUser.role !== 'client') {
        window.location.href = 'index.html';
    }
    
    document.getElementById('clientName').textContent = savedUser.username;
    loadClientData();
    
    // Send message
    document.getElementById('messageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const message = document.getElementById('messageText').value.trim();
        if (!message) {
            document.getElementById('messageError').textContent = 'Please enter a message!';
            return;
        }
        
        const users = JSON.parse(localStorage.getItem('users'));
        const user = users[savedUser.username];
        
        if (user.messages_left <= 0) {
            document.getElementById('messageError').textContent = 'You have no messages left!';
            return;
        }
        
        // Add message
        const newMessage = {
            text: message,
            timestamp: new Date().toISOString()
        };
        
        user.messages = user.messages || [];
        user.messages.unshift(newMessage);
        user.messages_left--;
        
        localStorage.setItem('users', JSON.stringify(users));
        
        document.getElementById('messageSuccess').textContent = 'Message sent successfully!';
        document.getElementById('messageForm').reset();
        loadClientData();
        
        setTimeout(() => {
            document.getElementById('messageSuccess').textContent = '';
        }, 3000);
    });
}

function loadClientData() {
    const savedUser = JSON.parse(localStorage.getItem('currentUser'));
    const users = JSON.parse(localStorage.getItem('users'));
    const user = users[savedUser.username];
    
    // Update counter
    document.getElementById('messagesLeft').textContent = user.messages_left;
    const fillPercent = (user.messages_left / 10) * 100;
    document.getElementById('counterFill').style.width = `${fillPercent}%`;
    
    // Update send button
    const sendBtn = document.getElementById('sendBtn');
    if (user.messages_left <= 0) {
        sendBtn.disabled = true;
        sendBtn.textContent = 'No Messages Left';
    } else {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Message';
    }
    
    // Load message history
    const messageHistory = document.getElementById('messageHistory');
    const messages = user.messages || [];
    
    if (messages.length === 0) {
        messageHistory.innerHTML = '<div class="message">No messages yet. Send your first message!</div>';
        return;
    }
    
    messageHistory.innerHTML = messages.map(msg => `
        <div class="message">
            <div class="timestamp">📅 ${new Date(msg.timestamp).toLocaleString()}</div>
            <div class="text">${escapeHtml(msg.text)}</div>
        </div>
    `).join('');
}

// Admin Dashboard Functions
if (window.location.pathname.includes('admin.html')) {
    const savedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!savedUser || savedUser.role !== 'admin') {
        window.location.href = 'index.html';
    }
    
    document.getElementById('adminName').textContent = savedUser.username;
    loadAdminData();
}

function loadAdminData() {
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const userList = document.getElementById('userList');
    
    // Calculate stats
    const totalUsers = Object.keys(users).length;
    let totalMessages = 0;
    
    Object.values(users).forEach(user => {
        if (user.messages) {
            totalMessages += user.messages.length;
        }
    });
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalMessages').textContent = totalMessages;
    
    // Create user list
    const userButtons = Object.keys(users).map(username => {
        if (username !== 'admin') {
            return `<button class="btn-user" onclick="viewUserMessages('${username}')">${username}</button>`;
        }
        return '';
    }).join('');
    
    userList.innerHTML = userButtons || '<p>No users yet</p>';
}

function viewUserMessages(username) {
    const users = JSON.parse(localStorage.getItem('users'));
    const user = users[username];
    
    document.getElementById('modalUsername').textContent = username;
    const messagesList = document.getElementById('userMessages');
    
    if (!user.messages || user.messages.length === 0) {
        messagesList.innerHTML = '<div class="message">No messages from this user yet.</div>';
    } else {
        messagesList.innerHTML = user.messages.map(msg => `
            <div class="message">
                <div class="timestamp">📅 ${new Date(msg.timestamp).toLocaleString()}</div>
                <div class="text">${escapeHtml(msg.text)}</div>
            </div>
        `).join('');
    }
    
    document.getElementById('userModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('userModal').style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize admin user if not exists
function initAdmin() {
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    if (!users.admin) {
        // Password 'pass123' hashed
        users.admin = {
            password: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
            role: 'admin',
            created: new Date().toISOString(),
            messages_left: 'unlimited',
            messages: []
        };
        localStorage.setItem('users', JSON.stringify(users));
    }
}

// Initialize
initAdmin();