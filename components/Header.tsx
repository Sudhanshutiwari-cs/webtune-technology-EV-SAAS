'use client';

import { useState, useEffect } from 'react';
import { Search, Bell, User, Settings, Wrench, Calendar, TrendingUp, LogOut, ChevronDown, Leaf, Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';


interface HeaderProps {
  activeSection?: string;
  onMenuClick?: () => void;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  mobile_number: string;
}

interface ShowroomData {
  id: string;
  showroom_name: string;
}

interface StatsData {
  active_repairs: number;
  today_revenue: number;
  pending_invoices: number;
}

export function Header({ activeSection = 'dashboard', onMenuClick }: HeaderProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [showroom, setShowroom] = useState<ShowroomData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Set current date
    const updateDate = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
      setCurrentDate(now.toLocaleDateString('en-US', options));
    };
    updateDate();
    
    fetchUserAndStats();
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  async function fetchUserAndStats() {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
        } catch (e) {
          console.error('Error parsing user:', e);
        }
      }
      
      const showroomStr = localStorage.getItem('showroom');
      if (showroomStr) {
        try {
          const showroomData = JSON.parse(showroomStr);
          setShowroom(showroomData);
        } catch (e) {
          console.error('Error parsing showroom:', e);
        }
      }
      
      let showroomId = null;
      if (showroomStr) {
        try {
          const showroomData = JSON.parse(showroomStr);
          showroomId = showroomData.id;
        } catch (e) {}
      }
      
      if (!showroomId) {
        const cookieShowroomId = document.cookie.split(';').find(c => c.trim().startsWith('showroom_id='));
        if (cookieShowroomId) {
          showroomId = cookieShowroomId.split('=')[1];
        }
      }
      
      if (showroomId) {
        await fetchStats(showroomId);
      } else {
        setStats({
          active_repairs: 0,
          today_revenue: 0,
          pending_invoices: 0
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }

  async function fetchStats(showroomId: string) {
    try {
      const { count: activeRepairs } = await supabase
        .from('repairs')
        .select('*', { count: 'exact', head: true })
        .eq('showroom_id', showroomId)
        .in('status', ['pending', 'in_progress']);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data: todayInvoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('showroom_id', showroomId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());
      
      let todayRevenue = 0;
      if (todayInvoices) {
        todayRevenue = todayInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      }
      
      const { count: pendingInvoices } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('showroom_id', showroomId)
        .eq('payment_status', 'pending');
      
      setStats({
        active_repairs: activeRepairs || 0,
        today_revenue: todayRevenue,
        pending_invoices: pendingInvoices || 0
      });
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        active_repairs: 0,
        today_revenue: 0,
        pending_invoices: 0
      });
    }
  }

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'dashboard':
        return 'Dashboard';
      case 'customers':
        return 'Customers';
      case 'vehicles':
        return 'Vehicles';
      case 'repairs':
        return 'Service';
      case 'invoices':
        return 'Invoices';
      default:
        return 'Dashboard';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('showroom');
    localStorage.removeItem('user_logged_in');
    
    const cookies = ['user_id', 'user_name', 'user_email', 'user_role', 'showroom_id', 'showroom_name', 'user_logged_in'];
    cookies.forEach(cookie => {
      document.cookie = `${cookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    });
    
    window.location.href = '/login';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
    }
  };

  return (
    <>
      <header className="h-16 md:h-20 bg-gradient-to-r from-white to-gray-50 border-b border-gray-200 flex items-center justify-between px-3 md:px-6 lg:px-8 sticky top-0 z-10 shadow-sm">
        {/* Left Section */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          {/* Mobile Menu Button */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-green-50 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
          )}
          
          <div className="min-w-0 flex-1 md:flex-none">
            <h2 className="text-base md:text-lg lg:text-xl text-gray-800 font-bold tracking-tight truncate">
              {getSectionTitle()}
            </h2>
            <div className="hidden md:flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-green-700" />
              <p className="text-xs text-green-700">{currentDate}</p>
            </div>
          </div>
          
          {/* Stats Cards - Hidden on mobile */}
          <div className="hidden lg:flex items-center gap-2 ml-2">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                <Wrench className="w-3 h-3 text-green-700" />
              </div>
              <div>
                <div className="text-xs text-green-700 font-medium hidden xl:block">Active</div>
                <div className="text-sm font-bold text-gray-800">{stats?.active_repairs || 0}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-green-700" />
              </div>
              <div>
                <div className="text-xs text-green-700 font-medium hidden xl:block">Revenue</div>
                <div className="text-sm font-bold text-gray-800">
                  ₹{((stats?.today_revenue || 0) / 1000).toFixed(0)}k
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 md:gap-2 lg:gap-3">
          {/* Mobile Date & Stats */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-lg">
              <Calendar className="w-3 h-3 text-green-700" />
              <span className="text-xs text-green-700 font-medium">{currentDate}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-lg">
              <Wrench className="w-3 h-3 text-green-700" />
              <span className="text-xs font-bold text-gray-800">{stats?.active_repairs || 0}</span>
            </div>
          </div>

          {/* Mobile Search Toggle */}
          <button 
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="md:hidden p-2 hover:bg-green-50 rounded-lg transition-colors"
          >
            <Search className="w-5 h-5 text-gray-700" />
          </button>

          {/* Desktop Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:block relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 lg:w-64 xl:w-80 pl-9 pr-3 py-1.5 md:py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm"
            />
          </form>

          {/* Notifications */}
          <button className="relative p-1.5 md:p-2 hover:bg-green-50 rounded-lg transition-colors">
            <Bell className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
            {stats?.pending_invoices && stats.pending_invoices > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            )}
          </button>

          {/* Settings - Hidden on very small screens */}
          <button className="hidden sm:block p-1.5 md:p-2 hover:bg-green-50 rounded-lg transition-colors">
            <Settings className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1 md:gap-2 pl-2 md:pl-3 border-l border-gray-200 hover:bg-green-50 rounded-lg transition-colors py-1 pr-1 md:pr-2"
            >
              <div className="text-right hidden xs:block">
                <div className="text-xs md:text-sm text-gray-800 font-semibold truncate max-w-[100px] md:max-w-[150px]">
                  {user?.name?.split(' ')[0] || 'User'}
                </div>
                <div className="text-xs text-green-700 capitalize hidden md:block">
                  {user?.role || 'User'}
                </div>
              </div>
              <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-green-600 to-emerald-700 rounded-full flex items-center justify-center shadow-md">
                <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-gray-500 hidden xs:block" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 md:w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                  <div className="p-3 md:p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-600 to-emerald-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <Leaf className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-800 truncate">
                          {user?.name || 'Guest'}
                        </div>
                        <div className="text-xs text-green-700 truncate">
                          {user?.email || 'No email'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-green-50 rounded-lg transition-colors">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">My Profile</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-green-50 rounded-lg transition-colors">
                      <Settings className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Settings</span>
                    </button>
                    <div className="border-t border-gray-200 my-2"></div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Search Bar */}
      {showMobileSearch && (
        <div className="md:hidden fixed top-16 left-0 right-0 bg-white border-b border-gray-200 p-3 z-10 shadow-md animate-slide-down">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
            <input
              type="text"
              placeholder="Search customers, vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowMobileSearch(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </form>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.2s ease-out;
        }
        @media (min-width: 480px) {
          .xs\\:block {
            display: block;
          }
        }
      `}</style>
    </>
  );
}