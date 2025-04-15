import React from 'react';
import { Link } from 'react-router-dom';
import AdminLookup from './AdminLookup';
import { Button } from "@/components/ui/button";
import { Home } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const AdminPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Order Lookup</h2>
          <AdminLookup />
        </div>
      </main>
    </div>
  );
};

export default AdminPage; 