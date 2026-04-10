import axios from 'axios';
import { db } from './instantdb';

const BACKEND_URL = 'http://localhost:3001';

export const authService = {
  getSession() {
    const session = localStorage.getItem('interview_ai_session');
    return session ? JSON.parse(session) : null;
  },

  async signup(email, password, name) {
    // Stage 1: Send the OTP using InstantDB natively
    // Note: We don't hash here, we keep it in memory so verifyOtp can pass to backend
    sessionStorage.setItem('pending_auth', JSON.stringify({ email, password, name }));
    try {
      await db.auth.sendMagicCode({ email });
      return true;
    } catch (e) {
      throw new Error(e.message || "Failed to send OTP.");
    }
  },

  async verifyOtp(email, code) {
    try {
      // 1. Verify Magic Code natively with InstantDB
      const authObj = await db.auth.signInWithMagicCode({ email, code });
      if (!authObj.user) throw new Error("Invalid Code");

      // 2. Fetch pending password
      const pendingData = JSON.parse(sessionStorage.getItem('pending_auth') || '{}');
      
      // 3. Forward string password to Backend to be securely Hashed via bcrypt
      if (pendingData.email === email && pendingData.password) {
        await axios.post(`${BACKEND_URL}/signup`, {
          email: pendingData.email,
          password: pendingData.password,
          name: pendingData.name,
          instantUserId: authObj.user.id
        });
        sessionStorage.removeItem('pending_auth');
      }

      // Maintain user session globally
      const userSession = { 
        id: authObj.user.id, 
        email: authObj.user.email,
        name: pendingData.name || authObj.user.email.split('@')[0]
      };
      localStorage.setItem('interview_ai_session', JSON.stringify(userSession));
      
      return userSession;
    } catch (e) {
      console.error(e);
      throw new Error(e.response?.data?.error || e.message || "Verification failed");
    }
  },

  async login(email, password) {
    try {
      // Send raw payload to Secure Backend logic
      const res = await axios.post(`${BACKEND_URL}/login`, {
        email,
        password
      });

      if (res.data.success && res.data.user) {
        // Maintain user session
        localStorage.setItem('interview_ai_session', JSON.stringify(res.data.user));
        return res.data.user;
      }
      throw new Error("Invalid response from server");
    } catch (e) {
       console.error(e);
       throw new Error(e.response?.data?.error || "Invalid email or password");
    }
  },

  logout() {
    localStorage.removeItem('interview_ai_session');
    db.auth.signOut().catch(() => {});
    window.location.href = '/login';
  },

  async sendResetOtp(email) {
    try {
      await db.auth.sendMagicCode({ email });
      return true;
    } catch (e) {
      throw new Error(e.message || "Failed to send reset OTP.");
    }
  },

  async verifyResetOtpAndUpdatePassword(email, code, newPassword) {
    try {
      const authObj = await db.auth.signInWithMagicCode({ email, code });
      if (!authObj.user) throw new Error("Invalid Code");

      await axios.post(`${BACKEND_URL}/reset-password`, {
        email: email,
        newPassword: newPassword,
        instantUserId: authObj.user.id
      });
      
      return true;
    } catch (e) {
      console.error(e);
      throw new Error(e.response?.data?.error || e.message || "Password reset failed");
    }
  },

  async sendLoginMagicCode(email) {
    try {
      await db.auth.sendMagicCode({ email });
      return true;
    } catch (e) {
      throw new Error(e.message || "Failed to send login code.");
    }
  },

  async verifyLoginMagicCode(email, code, name) {
    try {
      // 1. Verify code with InstantDB
      const authObj = await db.auth.signInWithMagicCode({ email, code });
      if (!authObj.user) throw new Error("Invalid Code");

      // 2. Fetch or create user details from backend
      const res = await axios.post(`${BACKEND_URL}/login-otp`, { 
        email,
        instantUserId: authObj.user.id,
        name: name || email.split('@')[0]
      });

      if (res.data.success && res.data.user) {
        localStorage.setItem('interview_ai_session', JSON.stringify(res.data.user));
        return res.data.user;
      }
      throw new Error("Login failed. Please try again.");
    } catch (e) {
      console.error(e);
      const errorMsg = e.response?.data?.error || e.message || "Login failed";
      throw new Error(errorMsg);
    }
  }
};
