/**
 * API - Backend REST Communication Module
 * Connects the vanilla frontend with the Node.js Express server.
 */

// Configure your Backend Server connection URL here:
const BACKEND_BASE_URL = 'http://localhost:3000';

// API endpoints prefix path
const API_BASE_URL = `${BACKEND_BASE_URL}/api`;

/**
 * Standardized fetch helper that handles request headers, cross-origin credentials,
 * and standard JSON error response structures.
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Set default configurations
  options.credentials = 'include'; // Crucial: Enables JWT cookie transmission
  options.headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, options);
    
    // Clear cookies if token is unauthorized
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/me')) {
      console.warn('[API] Received 401 Unauthorized. Clearing local cache/session.');
    }

    const data = await response.json();
    
    if (!response.ok) {
      // Extract error message from API response or fall back to status text
      const errorMessage = data.error || data.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`[API ERROR] Endpoint: ${endpoint} failed:`, error.message);
    throw error;
  }
}

const API = {
  /**
   * AUTH API
   */

  // 1. Sends an OTP registration request to user's email
  sendOtp: async (name, email) => {
    return apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    });
  },

  // 2. Completes registration by checking OTP and storing plain text password
  register: async (email, otp, password) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, otp, password }),
    });
  },

  // 3. Authenticates email and password, setting cookie session on success
  login: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // 4. Clears active session cookie
  logout: async () => {
    return apiRequest('/auth/logout', {
      method: 'POST',
    });
  },

  // 5. Performs session validation on page load
  getMe: async () => {
    return apiRequest('/auth/me', {
      method: 'GET',
    });
  },

  /**
   * COMPLAINTS AND AI FLOW
   */

  // 6. Requests Gemini model to generate a relevant follow-up question
  getAiQuestion: async (complaintText) => {
    return apiRequest('/ai/question', {
      method: 'POST',
      body: JSON.stringify({ complaint_text: complaintText }),
    });
  },

  // 7. Saves user issue along with the AI follow-up dialog
  submitComplaint: async (complaintText, aiQuestion, userAnswer) => {
    return apiRequest('/complaints', {
      method: 'POST',
      body: JSON.stringify({
        complaint_text: complaintText,
        ai_question: aiQuestion,
        user_answer: userAnswer,
      }),
    });
  },

  // 8. Fetches complaints submitted by the authenticated user
  getMyComplaints: async () => {
    return apiRequest('/complaints/my', {
      method: 'GET',
    });
  },

  // 9. Admin view: Retrieves all platform complaints with user identity joins
  getAllComplaints: async () => {
    return apiRequest('/admin/complaints', {
      method: 'GET',
    });
  },
};

// Make API globally available
window.API = API;
