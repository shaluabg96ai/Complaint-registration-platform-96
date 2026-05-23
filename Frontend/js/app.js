/**
 * FeedbackFlow - Frontend Single Page Application Router & Logic
 */

// Application State
const state = {
  currentUser: null, // { name, email, role }
  registration: {
    name: '',
    email: '',
    otp: '',
  },
  complaintWizard: {
    text: '',
    aiQuestion: '',
  },
};

// ==========================================================================
// DOM CONTENT LOADED INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  initFormListeners();
  checkSession();
});

// ==========================================================================
// CLIENT-SIDE ROUTER / VIEW SWITCHER
// ==========================================================================
function initRouter() {
  // Navigation Bar Click Handlers
  document.getElementById('nav-btn-my-complaints').addEventListener('click', () => {
    navigate('view-complaints-my');
  });

  document.getElementById('nav-btn-admin-dashboard').addEventListener('click', () => {
    navigate('view-admin-dashboard');
  });

  document.getElementById('btn-logout').addEventListener('click', handleLogout);

  // Authentication Switch Links
  document.getElementById('link-go-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('view-register');
  });

  document.getElementById('link-go-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('view-login');
  });

  // User Dashboard Navigation Helpers
  document.getElementById('btn-go-to-submit').addEventListener('click', () => {
    navigate('view-complaint-submit');
  });

  document.querySelector('.btn-submit-first').addEventListener('click', () => {
    navigate('view-complaint-submit');
  });

  document.getElementById('btn-back-to-complaints').addEventListener('click', () => {
    navigate('view-complaints-my');
  });
}

/**
 * Transitions from active view to targeted view, updating headers and loaders.
 */
function navigate(viewId) {
  console.log(`[ROUTER] Navigating to: ${viewId}`);

  // Hide all views
  const views = document.querySelectorAll('.app-view');
  views.forEach((v) => v.classList.add('hidden'));

  // Show targeted view
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.remove('hidden');
  }

  // Update navigation items and retrieve database collections dynamically
  updateNavigationUI();

  if (viewId === 'view-complaints-my') {
    loadMyComplaints();
  } else if (viewId === 'view-admin-dashboard') {
    loadAdminDashboard();
  } else if (viewId === 'view-complaint-submit') {
    resetComplaintWizard();
  } else if (viewId === 'view-register') {
    resetRegistrationWizard();
  }
}

/**
 * Updates global header navigation items based on current authenticated profile and role.
 */
function updateNavigationUI() {
  const header = document.getElementById('app-header');
  const greeting = document.getElementById('user-greeting');
  const btnMyComplaints = document.getElementById('nav-btn-my-complaints');
  const btnAdmin = document.getElementById('nav-btn-admin-dashboard');

  const activeView = document.querySelector('.app-view:not(.hidden)');
  const activeViewId = activeView ? activeView.id : '';

  if (!state.currentUser) {
    header.classList.add('hidden');
    return;
  }

  header.classList.remove('hidden');
  greeting.textContent = `Hello, ${state.currentUser.name}`;

  // Reset active classes
  btnMyComplaints.classList.remove('active');
  btnAdmin.classList.remove('active');

  if (state.currentUser.role === 'admin') {
    btnMyComplaints.classList.add('hidden');
    btnAdmin.classList.remove('hidden');
    
    if (activeViewId === 'view-admin-dashboard') {
      btnAdmin.classList.add('active');
    }
  } else {
    btnMyComplaints.classList.remove('hidden');
    btnAdmin.classList.add('hidden');
    
    if (activeViewId === 'view-complaints-my') {
      btnMyComplaints.classList.add('active');
    }
  }
}

// ==========================================================================
// SESSION CHECK ON LOAD
// ==========================================================================
async function checkSession() {
  try {
    const user = await window.API.getMe();
    state.currentUser = user;
    console.log('[SESSION] Active session detected:', user);

    if (user.role === 'admin') {
      navigate('view-admin-dashboard');
    } else {
      navigate('view-complaints-my');
    }
  } catch (error) {
    console.log('[SESSION] No active session found. Redirecting to login.');
    state.currentUser = null;
    navigate('view-login');
  }
}

// ==========================================================================
// FORMS LISTENERS & SUBMISSIONS
// ==========================================================================
function initFormListeners() {
  // Login Handler
  document.getElementById('form-login').addEventListener('submit', handleLogin);

  // Registration wizard steps
  document.getElementById('form-register-otp').addEventListener('submit', handleRegisterOtpRequest);
  document.getElementById('form-register-verify').addEventListener('submit', handleRegisterVerifyOtp);
  document.getElementById('form-register-password').addEventListener('submit', handleRegisterComplete);
  
  // Registration steps back buttons
  document.getElementById('btn-register-otp-back').addEventListener('click', () => {
    showRegistrationStep(1);
  });

  // Complaint submission wizard steps
  document.getElementById('btn-get-ai-question').addEventListener('click', handleGetAiQuestion);
  document.getElementById('btn-back-to-desc').addEventListener('click', () => {
    showComplaintStep(1);
  });
  document.getElementById('btn-complaint-final-submit').addEventListener('click', handleComplaintSubmit);
}

/**
 * Handle Login Form Submission
 */
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const submitBtn = document.getElementById('btn-login-submit');

  setLoadingState(submitBtn, true, 'Logging In...');

  try {
    const user = await window.API.login(email, password);
    state.currentUser = user;
    showAlert(`Welcome back, ${user.name}!`, 'success');
    
    if (user.role === 'admin') {
      navigate('view-admin-dashboard');
    } else {
      navigate('view-complaints-my');
    }
  } catch (error) {
    showAlert(error.message, 'error');
  } finally {
    setLoadingState(submitBtn, false, 'Log In');
  }
}

/**
 * Handle Registration Step 1: Send OTP code
 */
async function handleRegisterOtpRequest(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const submitBtn = document.getElementById('btn-register-otp-submit');

  setLoadingState(submitBtn, true, 'Sending OTP...');

  try {
    const response = await window.API.sendOtp(name, email);
    
    // Save info in temporary registration state
    state.registration.name = name;
    state.registration.email = email;

    document.getElementById('sent-otp-email').textContent = email;
    showAlert(response.message || 'OTP verification code sent successfully!', 'success');
    
    showRegistrationStep(2);
  } catch (error) {
    showAlert(error.message, 'error');
  } finally {
    setLoadingState(submitBtn, false, 'Send Verification Code');
  }
}

/**
 * Handle Registration Step 2: Verify OTP code format
 */
function handleRegisterVerifyOtp(e) {
  e.preventDefault();
  const otpInput = document.getElementById('register-otp').value.trim();

  if (otpInput.length !== 6 || isNaN(otpInput)) {
    showAlert('Please enter a valid 6-digit numeric code.', 'error');
    return;
  }

  // Store entered code in our state
  state.registration.otp = otpInput;
  showAlert('Code verification format accepted. Setup your password.', 'info');
  showRegistrationStep(3);
}

/**
 * Handle Registration Step 3: Complete registration using stored details
 */
async function handleRegisterComplete(e) {
  e.preventDefault();
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  const submitBtn = document.getElementById('btn-register-password-submit');

  if (password !== confirmPassword) {
    showAlert('Passwords do not match.', 'error');
    return;
  }

  setLoadingState(submitBtn, true, 'Registering...');

  try {
    const response = await window.API.register(
      state.registration.email,
      state.registration.otp,
      password
    );

    showAlert(response.message || 'Registration complete! Please log in.', 'success');
    navigate('view-login');
  } catch (error) {
    showAlert(error.message, 'error');
    // If invalid OTP, let them go back to verify
    showRegistrationStep(2);
  } finally {
    setLoadingState(submitBtn, false, 'Complete Registration');
  }
}

/**
 * Handle Logout
 */
async function handleLogout() {
  try {
    await window.API.logout();
    state.currentUser = null;
    showAlert('Logged out successfully.', 'success');
    navigate('view-login');
  } catch (error) {
    showAlert('Failed to log out correctly. Force redirecting.', 'error');
    state.currentUser = null;
    navigate('view-login');
  }
}

// ==========================================================================
// REGISTRATION STEP TRANSITIONS
// ==========================================================================
function showRegistrationStep(stepNumber) {
  // Hide all step sections
  document.getElementById('register-step-1').classList.add('hidden');
  document.getElementById('register-step-2').classList.add('hidden');
  document.getElementById('register-step-3').classList.add('hidden');

  // Remove active/completed styles from dots
  const dot1 = document.getElementById('dot-step-1');
  const dot2 = document.getElementById('dot-step-2');
  const dot3 = document.getElementById('dot-step-3');
  const connector12 = document.getElementById('connector-1-2');
  const connector23 = document.getElementById('connector-2-3');

  dot1.className = 'step-dot';
  dot2.className = 'step-dot';
  dot3.className = 'step-dot';
  connector12.className = 'step-connector';
  connector23.className = 'step-connector';

  // Apply step classes
  if (stepNumber === 1) {
    document.getElementById('register-step-1').classList.remove('hidden');
    dot1.classList.add('active');
  } else if (stepNumber === 2) {
    document.getElementById('register-step-2').classList.remove('hidden');
    dot1.classList.add('completed');
    connector12.classList.add('completed');
    dot2.classList.add('active');
  } else if (stepNumber === 3) {
    document.getElementById('register-step-3').classList.remove('hidden');
    dot1.classList.add('completed');
    connector12.classList.add('completed');
    dot2.classList.add('completed');
    connector23.classList.add('completed');
    dot3.classList.add('active');
  }
}

function resetRegistrationWizard() {
  document.getElementById('form-register-otp').reset();
  document.getElementById('form-register-verify').reset();
  document.getElementById('form-register-password').reset();
  state.registration = { name: '', email: '', otp: '' };
  showRegistrationStep(1);
}

// ==========================================================================
// COMPLAINT SUBMISSION FLOW (AI TRANSITIONS)
// ==========================================================================
async function handleGetAiQuestion() {
  const complaintText = document.getElementById('complaint-text').value.trim();
  const submitBtn = document.getElementById('btn-get-ai-question');

  if (!complaintText) {
    showAlert('Please describe your complaint issue before continuing.', 'error');
    return;
  }

  setLoadingState(submitBtn, true, 'Analyzing with AI...');

  try {
    const data = await window.API.getAiQuestion(complaintText);
    
    // Save complaint description and follow-up question
    state.complaintWizard.text = complaintText;
    state.complaintWizard.aiQuestion = data.ai_question;

    document.getElementById('ai-question-text').textContent = data.ai_question;
    showComplaintStep(2);
  } catch (error) {
    showAlert(error.message, 'error');
  } finally {
    setLoadingState(submitBtn, false, 'Analyze with AI & Continue');
  }
}

async function handleComplaintSubmit() {
  const answerText = document.getElementById('complaint-answer').value.trim();
  const submitBtn = document.getElementById('btn-complaint-final-submit');

  if (!answerText) {
    showAlert('Please answer the follow-up question to complete your feedback.', 'error');
    return;
  }

  setLoadingState(submitBtn, true, 'Submitting Complaint...');

  try {
    await window.API.submitComplaint(
      state.complaintWizard.text,
      state.complaintWizard.aiQuestion,
      answerText
    );

    showAlert('Complaint submitted and recorded successfully!', 'success');
    navigate('view-complaints-my');
  } catch (error) {
    showAlert(error.message, 'error');
  } finally {
    setLoadingState(submitBtn, false, 'Submit Complete Complaint');
  }
}

function showComplaintStep(stepNumber) {
  const step1 = document.getElementById('complaint-step-1');
  const step2 = document.getElementById('complaint-step-2');
  const node1 = document.getElementById('complaint-node-1');
  const node2 = document.getElementById('complaint-node-2');
  const connector = document.getElementById('complaint-connector');

  if (stepNumber === 1) {
    step1.classList.remove('hidden');
    step2.classList.add('hidden');
    node1.classList.add('active');
    node2.classList.remove('active');
    connector.style.background = 'var(--border-glass)';
  } else {
    step1.classList.add('hidden');
    step2.classList.remove('hidden');
    node1.classList.remove('active');
    node2.classList.add('active');
    connector.style.background = 'var(--accent-cyan)';
  }
}

function resetComplaintWizard() {
  document.getElementById('complaint-text').value = '';
  document.getElementById('complaint-answer').value = '';
  state.complaintWizard = { text: '', aiQuestion: '' };
  showComplaintStep(1);
}

// ==========================================================================
// RENDER MY COMPLAINTS DATA (USER GRID)
// ==========================================================================
async function loadMyComplaints() {
  const listContainer = document.getElementById('my-complaints-list');
  const emptyState = document.getElementById('my-complaints-empty');

  // Loading animation overlay inside target
  listContainer.innerHTML = `
    <div class="loading-wrapper" style="grid-column: 1/-1;">
      <div class="loader-spinner"></div>
      <p class="loading-message">Fetching your complaints history...</p>
    </div>
  `;
  emptyState.classList.add('hidden');

  try {
    const list = await window.API.getMyComplaints();
    listContainer.innerHTML = '';

    if (!list || list.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    list.forEach((complaint) => {
      const card = document.createElement('article');
      card.className = 'complaint-card glass-panel animate-fade-in';

      const formattedDate = new Date(complaint.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Extract brief ID string to reference
      const shortId = (complaint.id || '').substring(0, 8).toUpperCase();

      card.innerHTML = `
        <div class="complaint-card-header">
          <span class="complaint-id-tag">ID: #${shortId}</span>
          <span class="complaint-date">${formattedDate}</span>
        </div>
        
        <div class="complaint-section-title">Submitted Issue</div>
        <p class="complaint-text-block">${escapeHTML(complaint.complaintText)}</p>
        
        <div class="complaint-section-title dialog-title">AI Support Dialog</div>
        <div class="dialog-block">
          <div class="dialog-q">Q: ${escapeHTML(complaint.aiQuestion)}</div>
          <div class="dialog-a">A: ${escapeHTML(complaint.userAnswer)}</div>
        </div>
      `;

      listContainer.appendChild(card);
    });
  } catch (error) {
    listContainer.innerHTML = '';
    showAlert(`Failed to fetch history: ${error.message}`, 'error');
  }
}

// ==========================================================================
// RENDER ADMIN DASHBOARD DATA (ADMIN TABLE)
// ==========================================================================
async function loadAdminDashboard() {
  const tableBody = document.getElementById('admin-complaints-list');
  const tableWrapper = document.getElementById('admin-complaints-table-wrapper');
  const emptyState = document.getElementById('admin-complaints-empty');
  const totalStat = document.getElementById('admin-stat-total');

  tableBody.innerHTML = `
    <tr>
      <td colspan="4" style="text-align: center; padding: 3rem;">
        <div class="loader-spinner" style="margin: 0 auto 1rem;"></div>
        <p class="loading-message">Loading all platform complaints transactions...</p>
      </td>
    </tr>
  `;
  
  tableWrapper.classList.remove('hidden');
  emptyState.classList.add('hidden');

  try {
    const list = await window.API.getAllComplaints();
    tableBody.innerHTML = '';
    
    totalStat.textContent = list ? list.length : '0';

    if (!list || list.length === 0) {
      tableWrapper.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    list.forEach((complaint) => {
      const row = document.createElement('tr');

      const formattedDate = new Date(complaint.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      row.innerHTML = `
        <td>
          <div class="user-cell">
            <span class="user-cell-name">${escapeHTML(complaint.userName)}</span>
            <span class="user-cell-email">${escapeHTML(complaint.userEmail)}</span>
          </div>
        </td>
        <td>
          <p class="issue-text">${escapeHTML(complaint.complaintText)}</p>
        </td>
        <td class="dialog-column">
          <div class="dialog-qa-row">
            <div class="dialog-q">Q: ${escapeHTML(complaint.aiQuestion)}</div>
            <div class="dialog-a">A: ${escapeHTML(complaint.userAnswer)}</div>
          </div>
        </td>
        <td style="white-space: nowrap; color: var(--text-muted);">
          ${formattedDate}
        </td>
      `;

      tableBody.appendChild(row);
    });
  } catch (error) {
    tableBody.innerHTML = '';
    showAlert(`Failed to fetch database complaints: ${error.message}`, 'error');
  }
}

// ==========================================================================
// FLOATING NOTIFICATION BANNER ALERTS
// ==========================================================================
function showAlert(message, type = 'info') {
  const container = document.getElementById('global-alert-container');
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;

  let icon = '✦';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✗';

  alert.innerHTML = `
    <span class="alert-icon">${icon}</span>
    <span class="alert-message">${escapeHTML(message)}</span>
    <button type="button" class="alert-close">×</button>
  `;

  // Close button click listener
  alert.querySelector('.alert-close').addEventListener('click', () => {
    alert.style.transform = 'translateX(120%)';
    alert.style.opacity = '0';
    setTimeout(() => alert.remove(), 350);
  });

  container.appendChild(alert);

  // Auto remove after 4.5 seconds
  setTimeout(() => {
    if (alert.parentNode) {
      alert.style.transform = 'translateX(120%)';
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 350);
    }
  }, 4500);
}

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================
function setLoadingState(buttonElement, isLoading, loadingText = 'Loading...') {
  if (!buttonElement) return;

  if (isLoading) {
    buttonElement.setAttribute('disabled', 'true');
    // Save original innerHTML so we can restore it exactly
    buttonElement.dataset.originalContent = buttonElement.innerHTML;
    buttonElement.innerHTML = `
      <div class="loader-spinner" style="width:16px; height:16px; border-width:2px; border-top-color:currentColor;"></div>
      <span>${loadingText}</span>
    `;
  } else {
    buttonElement.removeAttribute('disabled');
    if (buttonElement.dataset.originalContent) {
      buttonElement.innerHTML = buttonElement.dataset.originalContent;
    }
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
