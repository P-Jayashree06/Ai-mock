import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, FileVideo } from 'lucide-react';
import ThemeToggle from './ThemeToggle';


import { authService } from '../../lib/authService';

export default function Navbar() {
  const user = authService.getSession();
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-subtle bg-bg-primary/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-2">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white font-display font-bold">
                iA
              </div>
              <span className="font-display font-bold text-xl tracking-tight hidden sm:block">InterviewAI</span>
            </Link>
          </div>

          {user ? (
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors flex items-center space-x-1">
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Dashboard</span>
              </Link>
              <Link to="/interview/setup" className="text-text-secondary hover:text-text-primary transition-colors flex items-center space-x-1">
                <FileVideo className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">New Interview</span>
              </Link>
              <div className="h-6 w-px bg-subtle"></div>
              <ThemeToggle />
              <button 
                onClick={handleLogout}
                className="text-text-secondary hover:text-accent-red transition-colors flex items-center space-x-1"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <ThemeToggle />
          )}
        </div>
      </div>
    </nav>
  );
}
