// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAUKRuFgZIAO8MaWlMv32s55EOWAVRmB2o",
    authDomain: "ai-web-9392e.firebaseapp.com",
    projectId: "ai-web-9392e",
    storageBucket: "ai-web-9392e.firebasestorage.app",
    messagingSenderId: "116138523194",
    appId: "1:116138523194:web:f37a49f16c7c26a8245303",
    measurementId: "G-TFH9TTVM9T"
};

// Initialize Firebase
let firebaseApp, auth, db;
try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
} catch (error) {
    console.log("Firebase already initialized or not available");
}

// ===== COMMON UTILITY FUNCTIONS =====

// Check if user is logged in
function checkAuth() {
    return new Promise((resolve) => {
        if (!auth) {
            resolve(false);
            return;
        }
        
        auth.onAuthStateChanged((user) => {
            if (user) {
                resolve(user);
            } else {
                resolve(false);
            }
        });
    });
}

// Format date
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Generate random number between min and max
function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// ===== UI COMPONENTS =====

// Toggle mobile menu
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    }
}

// Close mobile menu
function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Toggle modal
function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (show) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
}

// Close modal when clicking outside
function setupModalClose() {
    document.addEventListener('click', (e) => {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            if (e.target === modal) {
                toggleModal(modal.id, false);
            }
        });
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                toggleModal(modal.id, false);
            });
        }
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        border-left: 4px solid var(--${type});
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}" 
               style="color: var(--${type})"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// ===== AUTHENTICATION =====

// Google Sign In
async function signInWithGoogle() {
    try {
        if (!auth) {
            showNotification('Firebase not initialized', 'error');
            return;
        }
        
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        showNotification('Signed in successfully!', 'success');
        
        // Redirect to dashboard after 1 second
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
        return user;
    } catch (error) {
        console.error('Google sign in error:', error);
        showNotification('Failed to sign in with Google', 'error');
    }
}

// Email/Password Sign In
async function signInWithEmail(email, password) {
    try {
        if (!auth) {
            showNotification('Firebase not initialized', 'error');
            return;
        }
        
        const result = await auth.signInWithEmailAndPassword(email, password);
        showNotification('Signed in successfully!', 'success');
        
        // Redirect to dashboard after 1 second
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
        return result.user;
    } catch (error) {
        console.error('Sign in error:', error);
        showNotification(error.message, 'error');
    }
}

// Sign Up
async function signUp(email, password, name) {
    try {
        if (!auth) {
            showNotification('Firebase not initialized', 'error');
            return;
        }
        
        const result = await auth.createUserWithEmailAndPassword(email, password);
        const user = result.user;
        
        // Update profile with name
        await user.updateProfile({
            displayName: name
        });
        
        // Create user document in Firestore
        if (db) {
            await db.collection('users').doc(user.uid).set({
                email: user.email,
                name: name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                plan: 'free',
                adRevenue: 0
            });
        }
        
        showNotification('Account created successfully!', 'success');
        
        // Redirect to dashboard after 1 second
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
        return user;
    } catch (error) {
        console.error('Sign up error:', error);
        showNotification(error.message, 'error');
    }
}

// Sign Out
async function signOut() {
    try {
        if (!auth) {
            showNotification('Firebase not initialized', 'error');
            return;
        }
        
        await auth.signOut();
        showNotification('Signed out successfully', 'success');
        
        // Redirect to home page after 1 second
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (error) {
        console.error('Sign out error:', error);
        showNotification(error.message, 'error');
    }
}

// ===== DASHBOARD FUNCTIONS =====

// Load user data
async function loadUserData() {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Update UI with user data
    const userAvatar = document.querySelector('.user-avatar');
    const userName = document.querySelector('.user-info h4');
    const userEmail = document.querySelector('.user-info p');
    
    if (userAvatar && user.displayName) {
        userAvatar.textContent = user.displayName.charAt(0).toUpperCase();
    }
    
    if (userName && user.displayName) {
        userName.textContent = user.displayName;
    }
    
    if (userEmail && user.email) {
        userEmail.textContent = user.email;
    }
    
    return user;
}

// Simulate real-time updates
function simulateRealtimeUpdates() {
    // Update stats every 30 seconds
    setInterval(() => {
        const stats = document.querySelectorAll('.widget-value');
        stats.forEach(stat => {
            if (stat.textContent.includes('$')) {
                const current = parseFloat(stat.textContent.replace('$', ''));
                const change = randomBetween(-5, 10) / 100;
                const newValue = Math.max(0, current + change);
                stat.textContent = formatCurrency(newValue);
            } else if (!isNaN(parseInt(stat.textContent))) {
                const current = parseInt(stat.textContent);
                const change = randomBetween(-1, 3);
                const newValue = Math.max(0, current + change);
                stat.textContent = newValue.toString();
            }
        });
    }, 30000);
    
    // Update AI message every 2 minutes
    setInterval(updateAIMessage, 120000);
    
    // Add random notifications
    setInterval(addRandomNotification, 60000);
}

// Update AI message
function updateAIMessage() {
    const messages = [
        "I've optimized your schedule for maximum productivity today.",
        "Detected a potential issue in your 'Website Redesign' project. Want me to fix it?",
        "Your ad revenue increased by 15% this week! Keep up the great work.",
        "I've automatically rescheduled conflicting meetings for better workflow.",
        "New AI insights available for your marketing campaign. Check analytics.",
        "Energy level analysis suggests taking a 10-minute break at 3 PM.",
        "Auto-detected 3 new tasks from your email. Added to your project.",
        "Your productivity score is 87% this week - 5% higher than average!",
        "I've prepared the agenda for your 2 PM meeting with the design team.",
        "Security scan completed. All systems are secure and up to date."
    ];
    
    const aiMessage = document.querySelector('.ai-message');
    if (aiMessage) {
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        aiMessage.textContent = `"${randomMessage}"`;
        aiMessage.classList.add('animate-fadeIn');
        
        setTimeout(() => {
            aiMessage.classList.remove('animate-fadeIn');
        }, 1000);
    }
}

// Add random notification
function addRandomNotification() {
    const notifications = [
        {
            type: 'critical',
            title: 'Risk Detected',
            message: 'Potential delay in frontend development',
            icon: 'exclamation-triangle'
        },
        {
            type: 'important',
            title: 'Meeting Updated',
            message: 'Team sync rescheduled to avoid conflicts',
            icon: 'calendar-check'
        },
        {
            type: 'info',
            title: 'Ad Revenue',
            message: 'New ad impressions recorded in the last hour',
            icon: 'ad'
        },
        {
            type: 'info',
            title: 'Task Completed',
            message: 'AI assistant auto-completed 3 low-priority tasks',
            icon: 'check-circle'
        },
        {
            type: 'success',
            title: 'Milestone Reached',
            message: 'Project ahead of schedule by 2 days',
            icon: 'trophy'
        }
    ];
    
    const randomNotif = notifications[Math.floor(Math.random() * notifications.length)];
    
    // Update notification badge
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        const current = parseInt(badge.textContent) || 0;
        badge.textContent = (current + 1).toString();
        badge.classList.add('pulse');
        
        setTimeout(() => {
            badge.classList.remove('pulse');
        }, 2000);
    }
    
    // Add to notifications list
    const notificationsList = document.querySelector('.notifications-list');
    if (notificationsList) {
        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item notification-${randomNotif.type}`;
        notificationItem.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${randomNotif.icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${randomNotif.title}</div>
                <div class="notification-text">${randomNotif.message}</div>
                <div class="notification-time">Just now</div>
            </div>
        `;
        
        notificationsList.insertBefore(notificationItem, notificationsList.firstChild);
        
        // Limit to 10 notifications
        const items = notificationsList.querySelectorAll('.notification-item');
        if (items.length > 10) {
            items[items.length - 1].remove();
        }
    }
}

// ===== CHART FUNCTIONS =====

// Initialize progress chart
function initProgressChart() {
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Tasks Completed',
                data: [12, 19, 8, 15, 22, 10, 7],
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                borderColor: 'rgba(67, 97, 238, 1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return value + ' tasks';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Initialize revenue chart
function initRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Ad Revenue',
                data: [12.5, 19.1, 15.2, 25.1, 32.4, 28.9, 45.2, 38.7, 42.3, 51.8, 48.5, 55.2],
                backgroundColor: 'rgba(247, 37, 133, 0.8)',
                borderColor: 'rgba(247, 37, 133, 1)',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ===== INITIALIZATION =====

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Setup mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    // Setup sidebar close
    const sidebarClose = document.querySelector('.sidebar-close');
    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeMobileMenu);
    }
    
    // Setup modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                toggleModal(modal.id, false);
            }
        });
    });
    
    // Setup modals
    setupModalClose();
    
    // Setup Google sign in buttons
    document.querySelectorAll('.google-signin').forEach(btn => {
        btn.addEventListener('click', signInWithGoogle);
    });
    
    // Initialize charts on dashboard
    if (document.getElementById('progressChart')) {
        initProgressChart();
        initRevenueChart();
        simulateRealtimeUpdates();
        updateAIMessage(); // Initial AI message
    }
    
    // Check auth for protected pages
    if (window.location.pathname.includes('dashboard')) {
        loadUserData();
    }
    
    // Setup logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', signOut);
    }
    
    // Setup form submissions
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = this.querySelector('[name="email"]').value;
            const password = this.querySelector('[name="password"]').value;
            await signInWithEmail(email, password);
        });
    }
    
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = this.querySelector('[name="name"]').value;
            const email = this.querySelector('[name="email"]').value;
            const password = this.querySelector('[name="password"]').value;
            await signUp(email, password, name);
        });
    }
    
    // Initialize real-time clock
    function updateClock() {
        const now = new Date();
        const clockElement = document.querySelector('.real-time-clock');
        if (clockElement) {
            clockElement.textContent = now.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }
    
    setInterval(updateClock, 1000);
    updateClock();
    
    // AdSense initialization
    (adsbygoogle = window.adsbygoogle || []).push({});
});