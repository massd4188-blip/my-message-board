// GitHub Pages configuration - FETCH FROM SAME DOMAIN
let currentUser = null;

// Helper function to fetch JSON from same domain
async function fetchUsers() {
    try {
        // Fetch from same directory as the website
        const response = await fetch('./users.json?t=' + Date.now());
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to fetch users.json');
    } catch (error) {
        console.error('Error fetching users:', error);
        return null;
    }
}

// Helper function to fetch text files from same domain
async function fetchMessages(username) {
    try {
        const response = await fetch(`./messages/${username}_messages.txt?t=${Date.now()}`);
        if (response.ok) {
            return await response.text();
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Hash password using SHA-256 (must match Python's method)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Login function
window.loginUser = async function() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    if (!username || !password) {
        errorDiv.textContent = 'Please enter username and password!';
        return;
    }
    
    const users = await fetchUsers();
    if (!users) {
        errorDiv.textContent = 'Cannot load users. Please refresh the page.';
        console.error('Users file not found or inaccessible');
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

// Register function
window.registerUser = async function() {
    const errorDiv = document.getElementById('registerError');
    errorDiv.innerHTML = `
        ⚠️ Please use the Python script to register.<br>
        Run: python message_panel.py<br>
        Then choose option 2 to register.
    `;
};

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

// Check if already logged in
const savedUser = JSON.parse(sessionStorage.getItem('currentUser'));
if (savedUser && (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/my-message-board/'))) {
    if (savedUser.role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'client.html';
    }
}
