import React, { useState, useEffect } from 'react';
import { User, Mail, Save, Calendar, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../lib/authService';
import Navbar from '../components/shared/Navbar';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const [session, setSession] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const userSession = authService.getSession();
    if (userSession) {
      setSession(userSession);
      setName(userSession.name || '');
      setEmail(userSession.email || '');
    }
  }, []);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    // Update session
    const updatedSession = { ...session, name };
    localStorage.setItem('interview_ai_session', JSON.stringify(updatedSession));
    
    // Also try to update mock users if offline
    let mockUsers = JSON.parse(localStorage.getItem('interview_ai_mock_users') || '[]');
    const userIndex = mockUsers.findIndex(u => u.email === session.email);
    if(userIndex !== -1) {
      mockUsers[userIndex].name = name;
      localStorage.setItem('interview_ai_mock_users', JSON.stringify(mockUsers));
    }

    setSession(updatedSession);
    setIsEditing(false);
    toast.success('Profile updated successfully!');
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-bg-primary font-body antialiased selection:bg-accent-primary selection:text-white pb-20 sm:pb-0">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl overflow-hidden border border-subtle"
        >
          {/* Header Banner */}
          <div className="h-32 bg-gradient-primary relative">
            <div className="absolute -bottom-12 left-8">
              <div className="w-24 h-24 rounded-2xl bg-bg-secondary border-4 border-bg-primary flex items-center justify-center text-4xl font-display font-bold text-accent-primary shadow-xl">
                {name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
          
          <div className="pt-16 pb-8 px-8">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-3xl font-display font-bold text-text-primary">{session.name}</h1>
                <p className="text-text-secondary flex items-center mt-1 text-sm font-medium">
                  <Shield className="w-4 h-4 mr-1 text-accent-primary" /> User Profile
                </p>
              </div>
              <button 
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className={`px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-all font-medium ${
                  isEditing ? 'bg-gradient-primary text-white shadow-glow' : 'bg-bg-secondary text-text-primary hover:bg-bg-tertiary border border-subtle shadow-sm'
                }`}
              >
                {isEditing ? (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Details */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute inset-y-0 left-0 pl-4 flex items-center my-auto h-5 w-9 text-text-muted pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isEditing}
                      className={`w-full pl-12 pr-4 py-3 bg-bg-secondary border border-subtle rounded-xl text-text-primary transition-all outline-none ${
                        isEditing ? 'focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary' : 'opacity-80 cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute inset-y-0 left-0 pl-4 flex items-center my-auto h-5 w-9 text-text-muted pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full pl-12 pr-4 py-3 bg-bg-tertiary border border-subtle rounded-xl text-text-muted opacity-70 cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-2 text-xs text-text-muted font-medium">Email address cannot be changed.</p>
                </div>
              </div>
              
              {/* Stats/Extra info */}
              <div className="bg-bg-secondary border border-subtle rounded-2xl p-6 shadow-sm">
                <h3 className="font-medium text-text-primary mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-accent-primary" /> Account Information
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2.5 border-b border-subtle/50">
                    <span className="text-text-secondary text-sm">Role</span>
                    <span className="text-text-primary font-medium text-sm">Candidate</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-subtle/50">
                    <span className="text-text-secondary text-sm">Status</span>
                    <span className="text-accent-primary font-medium text-sm flex items-center">
                      <span className="w-2 h-2 rounded-full bg-accent-primary mr-2 animate-pulse shadow-[0_0_8px_rgba(var(--color-accent-primary),0.8)]"></span>
                      Verified
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-text-secondary text-sm">Member Since</span>
                    <span className="text-text-primary font-medium text-sm">Recently Joined</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </motion.div>
      </main>
    </div>
  );
}
