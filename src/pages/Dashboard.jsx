import React from 'react';
import Navbar from '../components/shared/Navbar';
import DashboardContent from '../components/dashboard/Dashboard';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardContent />
      </main>
    </div>
  );
}
