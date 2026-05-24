'use client';

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Wrench, 
  FileText, 
  TrendingUp, 
  Building2, 
  Zap, 
  Battery,
  Car,
  Settings,
  Leaf
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';


interface SidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

interface ShowroomData {
  id: string;
  showroom_name: string;
  business_type: string;
}

interface BrandingData {
  primary_color: string;
  secondary_color: string;
  logo_url: string;
}

interface StatsData {
  total_customers: number;
  total_vehicles: number;
  total_invoices: number;
  monthly_revenue: number;
  revenue_target: number;
  revenue_growth: number;
}

// EV Green Color Palette
const EV_GREEN = {
  primary: '#00C853',
  primaryDark: '#009624',
  primaryLight: '#69F0AE',
  secondary: '#00E676',
  accent: '#00B248',
  gradient: 'linear-gradient(135deg, #00C853, #00E676)',
  gradientDark: 'linear-gradient(135deg, #009624, #00C853)',
  background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)',
  text: '#1B5E20'
};

export function Sidebar({ activeSection: propActiveSection, onSectionChange: propOnSectionChange }: SidebarProps) {
  const [internalActiveSection, setInternalActiveSection] = useState('dashboard');
  const [showroom, setShowroom] = useState<ShowroomData | null>(null);
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const activeSection = propActiveSection !== undefined ? propActiveSection : internalActiveSection;
  const onSectionChange = propOnSectionChange || setInternalActiveSection;

  useEffect(() => {
    fetchShowroomAndData();
  }, []);

  async function fetchShowroomAndData() {
    try {
      let showroomId = null;
      
      const showroomStr = localStorage.getItem('showroom');
      if (showroomStr) {
        try {
          const showroomData = JSON.parse(showroomStr);
          showroomId = showroomData.id;
          setShowroom(showroomData);
        } catch (e) {
          console.error('Error parsing showroom:', e);
        }
      }
      
      if (!showroomId) {
        const cookieShowroomId = document.cookie.split(';').find(c => c.trim().startsWith('showroom_id='));
        if (cookieShowroomId) {
          showroomId = cookieShowroomId.split('=')[1];
        }
      }
      
      if (showroomId) {
        const { data: brandingData, error: brandingError } = await supabase
          .from('showroom_branding')
          .select('primary_color, secondary_color, logo_url')
          .eq('showroom_id', showroomId)
          .single();
        
        if (!brandingError && brandingData) {
          setBranding(brandingData);
          const primaryColor = brandingData.primary_color || EV_GREEN.primary;
          const secondaryColor = brandingData.secondary_color || EV_GREEN.secondary;
          document.documentElement.style.setProperty('--brand-primary', primaryColor);
          document.documentElement.style.setProperty('--brand-secondary', secondaryColor);
        }
        
        await fetchStats(showroomId);
      }
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats(showroomId: string) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      
      const { count: customersCount } = await supabase
        .from('showroom_users')
        .select('*', { count: 'exact', head: true });
      
      const { count: vehiclesCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('showroom_id', showroomId);
      
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('showroom_id', showroomId)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);
      
      let monthlyRevenue = 0;
      if (!invoicesError && invoices) {
        monthlyRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      }
      
      const { count: invoicesCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('showroom_id', showroomId);
      
      const revenueTarget = monthlyRevenue * 1.2;
      const revenueGrowth = monthlyRevenue > 0 ? 15 : 0;
      
      setStats({
        total_customers: customersCount || 0,
        total_vehicles: vehiclesCount || 0,
        total_invoices: invoicesCount || 0,
        monthly_revenue: monthlyRevenue,
        revenue_target: revenueTarget,
        revenue_growth: revenueGrowth
      });
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        total_customers: 0,
        total_vehicles: 0,
        total_invoices: 0,
        monthly_revenue: 0,
        revenue_target: 0,
        revenue_growth: 0
      });
    }
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'repairs', label: 'Service', icon: Wrench },
    { id: 'invoices', label: 'Invoices', icon: FileText },
  ];

  const getPrimaryColor = () => branding?.primary_color || EV_GREEN.primary;
  const getSecondaryColor = () => branding?.secondary_color || EV_GREEN.secondary;
  
  const getGradientStyle = () => {
    if (branding?.primary_color && branding?.secondary_color) {
      return {
        background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})`
      };
    }
    return { background: EV_GREEN.gradient };
  };

  const getButtonStyle = (isActive: boolean) => {
    if (isActive) {
      if (branding?.primary_color && branding?.secondary_color) {
        return {
          background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})`,
          color: 'white',
          boxShadow: '0 4px 12px rgba(0, 200, 83, 0.3)'
        };
      }
      return {
        background: EV_GREEN.gradient,
        color: 'white',
        boxShadow: '0 4px 12px rgba(0, 200, 83, 0.3)'
      };
    }
    return {
      color: '#374151',
      background: 'transparent'
    };
  };

  return (
    <div className="w-64 h-full bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex flex-col shadow-lg">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105"
            style={getGradientStyle()}
          >
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-gray-900 text-lg font-bold tracking-tight">
              {showroom?.showroom_name || 'EV Service Hub'}
            </h1>
            <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
              <Battery className="w-3 h-3" />
              {showroom?.business_type || 'Electric Vehicle'} Management
            </p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const buttonStyle = getButtonStyle(isActive);
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'shadow-md' 
                  : 'hover:bg-green-50 hover:text-green-700'
              }`}
              style={buttonStyle}
            >
              <Icon className={`w-5 h-5 transition-colors ${
                !isActive && 'text-gray-500 group-hover:text-green-600'
              }`} />
              <span className="font-medium text-sm">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-green-700" />
          </div>
          <div>
            <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">EV Insights</span>
            <p className="text-xs text-green-600">Real-time metrics</p>
          </div>
        </div>
        
        {loading ? (
          <div className="space-y-3">
            <div className="h-3 bg-green-200 rounded-full animate-pulse"></div>
            <div className="h-8 bg-green-200 rounded-lg animate-pulse"></div>
            <div className="h-2 bg-green-200 rounded-full animate-pulse"></div>
          </div>
        ) : (
          <>
            <div className="mb-2">
              <div className="text-xs text-green-700 font-medium mb-1">Monthly Revenue</div>
              <div className="text-2xl font-bold text-gray-900">
                ₹{(stats?.monthly_revenue || 0).toLocaleString('en-IN')}
              </div>
            </div>
            
            {stats && stats.revenue_target > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-green-700 mb-1">
                  <span>Progress</span>
                  <span className="font-semibold">
                    {Math.min(Math.round((stats.monthly_revenue / stats.revenue_target) * 100), 100)}%
                  </span>
                </div>
                <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((stats.monthly_revenue / stats.revenue_target) * 100, 100)}%`,
                      background: EV_GREEN.gradient
                    }}
                  ></div>
                </div>
                <div className="text-xs text-green-600 mt-1 flex justify-between">
                  <span>Target: ₹{Math.round(stats.revenue_target).toLocaleString('en-IN')}</span>
                  <span className="text-green-700 font-semibold">+{stats.revenue_growth}%</span>
                </div>
              </div>
            )}
            
            <div className="pt-3 border-t border-green-200">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{stats?.total_customers || 0}</div>
                  <div className="text-xs text-green-700">Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{stats?.total_vehicles || 0}</div>
                  <div className="text-xs text-green-700">Vehicles</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{stats?.total_invoices || 0}</div>
                  <div className="text-xs text-green-700">Invoices</div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 text-center">
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                <Leaf className="w-3 h-3 text-green-700" />
                <span className="text-xs text-green-800 font-medium">Eco-Friendly</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-auto p-4">
        <div className="h-1 w-full bg-gradient-to-r from-green-200 via-green-400 to-green-200 rounded-full"></div>
      </div>
    </div>
  );
}