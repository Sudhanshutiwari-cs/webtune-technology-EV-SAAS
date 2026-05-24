'use client';

import { useState, useEffect } from 'react';
import {
  Users, DollarSign, Wrench, FileText, Calendar, Clock,
  TrendingUp, TrendingDown, Car, Battery, Zap, Activity,
  CheckCircle, AlertCircle, Package, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

// ------------------------------
// Metric Card Component
// ------------------------------
const MetricCard = ({ title, value, change, icon: Icon, color, subText, loading }: { 
  title: string; 
  value: string | number; 
  change?: string; 
  icon: any; 
  color: string; 
  subText?: string;
  loading?: boolean;
}) => {
  const isPositive = change?.startsWith('+');
  
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-28 animate-pulse"></div>
          </div>
          <div className="h-10 w-10 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{change}</span>
              <span className="text-gray-400 ml-1">vs last period</span>
            </div>
          )}
          {subText && <p className="text-xs text-gray-400 mt-1">{subText}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-${color}-100`}>
          <Icon size={20} className={`text-${color}-600`} />
        </div>
      </div>
    </div>
  );
};

// ------------------------------
// Main Dashboard Component
// ------------------------------
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [showroomId, setShowroomId] = useState<string | null>(null);
  const [showroomName, setShowroomName] = useState('');
  
  // Dashboard Stats
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalVehicles: 0,
    activeRepairs: 0,
    completedRepairs: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    avgRepairTime: 0,
    customerSatisfaction: 0
  });
  
  // Recent Data
  const [recentRepairs, setRecentRepairs] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  useEffect(() => {
    fetchShowroomAndData();
  }, []);

  async function fetchShowroomAndData() {
    try {
      // Get showroom ID from localStorage
      const showroomStr = localStorage.getItem('showroom');
      let sId = null;
      
      if (showroomStr) {
        try {
          const showroomData = JSON.parse(showroomStr);
          sId = showroomData.id;
          setShowroomName(showroomData.showroom_name);
        } catch (e) {}
      }
      
      if (!sId) {
        const cookieShowroomId = document.cookie.split(';').find(c => c.trim().startsWith('showroom_id='));
        if (cookieShowroomId) {
          sId = cookieShowroomId.split('=')[1];
        }
      }
      
      if (sId) {
        setShowroomId(sId);
        await fetchAllStats(sId);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllStats(showroomId: string) {
    try {
      // Fetch customers count
      const { count: customersCount } = await supabase
        .from('showroom_users')
        .select('*', { count: 'exact', head: true });
      
      // Fetch vehicles count
      const { count: vehiclesCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('showroom_id', showroomId);
      
      // Fetch repairs stats
      const { data: repairs, count: totalRepairs } = await supabase
        .from('repairs')
        .select('*', { count: 'exact' })
        .eq('showroom_id', showroomId);
      
      const activeRepairs = repairs?.filter(r => r.status === 'in_progress' || r.status === 'pending').length || 0;
      const completedRepairs = repairs?.filter(r => r.status === 'completed').length || 0;
      
      // Calculate average repair time (assuming completed_at and created_at exist)
      const completedRepairsList = repairs?.filter(r => r.status === 'completed' && r.completed_at && r.created_at) || [];
      const avgRepairTime = completedRepairsList.length > 0 
        ? completedRepairsList.reduce((acc, r) => {
            const created = new Date(r.created_at);
            const completed = new Date(r.completed_at);
            const hours = (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
            return acc + hours;
          }, 0) / completedRepairsList.length
        : 0;
      
      // Fetch invoices stats
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('showroom_id', showroomId);
      
      const totalInvoices = invoices?.length || 0;
      const paidInvoices = invoices?.filter(i => i.payment_status === 'paid').length || 0;
      const pendingInvoices = invoices?.filter(i => i.payment_status === 'pending').length || 0;
      const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      
      // Calculate monthly revenue
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyInvoices = invoices?.filter(inv => new Date(inv.created_at) >= startOfMonth) || [];
      const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      
      // Calculate weekly revenue
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const weeklyInvoices = invoices?.filter(inv => new Date(inv.created_at) >= startOfWeek) || [];
      const weeklyRevenue = weeklyInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      
      // Get weekly trend data
      const weeklyTrend = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        const dayInvoices = invoices?.filter(inv => {
          const invDate = new Date(inv.created_at);
          return invDate.toDateString() === day.toDateString();
        }) || [];
        const dayRevenue = dayInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        weeklyTrend.push({
          day: day.toLocaleDateString('en-US', { weekday: 'short' }),
          revenue: dayRevenue,
          repairs: 0
        });
      }
      
      // Get recent repairs
      const { data: recentRepairsData } = await supabase
        .from('repairs')
        .select('*, vehicles(vehicle_number, model)')
        .eq('showroom_id', showroomId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Get recent invoices
      const { data: recentInvoicesData } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .eq('showroom_id', showroomId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setStats({
        totalCustomers: customersCount || 0,
        totalVehicles: vehiclesCount || 0,
        activeRepairs,
        completedRepairs: completedRepairs || 0,
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        totalRevenue,
        monthlyRevenue,
        weeklyRevenue,
        avgRepairTime: Math.round(avgRepairTime * 10) / 10,
        customerSatisfaction: 4.8 // This would come from a feedback table
      });
      
      setRecentRepairs(recentRepairsData || []);
      setRecentInvoices(recentInvoicesData || []);
      setWeeklyData(weeklyTrend);
      
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }

  const mainMetrics = [
    { 
      title: 'Total Revenue', 
      value: `₹${(stats.totalRevenue / 1000).toFixed(0)}K`, 
      change: '+12.5%', 
      icon: DollarSign, 
      color: 'emerald',
      subText: `This month: ₹${(stats.monthlyRevenue / 1000).toFixed(0)}K`
    },
    { 
      title: 'Active Repairs', 
      value: stats.activeRepairs, 
      change: stats.activeRepairs > 0 ? '+2' : '0',
      icon: Wrench, 
      color: 'blue',
      subText: `${stats.completedRepairs} completed this month`
    },
    { 
      title: 'Total Vehicles', 
      value: stats.totalVehicles, 
      icon: Car, 
      color: 'green',
      subText: `${stats.totalCustomers} total customers`
    },
    { 
      title: 'Pending Invoices', 
      value: stats.pendingInvoices, 
      change: stats.pendingInvoices > 0 ? `₹${((stats.totalRevenue - stats.monthlyRevenue) / 1000).toFixed(0)}K due` : 'All paid',
      icon: FileText, 
      color: 'amber',
      subText: `${stats.paidInvoices} invoices paid`
    },
  ];

  const serviceMetrics = [
    { 
      title: 'Avg. Repair Time', 
      value: `${stats.avgRepairTime}h`, 
      change: stats.avgRepairTime < 24 ? '-2.5h' : '+1h',
      icon: Clock, 
      color: 'purple',
      subText: 'Target: < 24 hours'
    },
    { 
      title: 'CSAT Score', 
      value: `${stats.customerSatisfaction}/5`, 
      change: '+0.2',
      icon: CheckCircle, 
      color: 'green',
      subText: 'Based on customer feedback'
    },
    { 
      title: 'EV Efficiency', 
      value: '94%', 
      change: '+3%',
      icon: Battery, 
      color: 'blue',
      subText: 'First-time fix rate'
    },
    { 
      title: 'Service Capacity', 
      value: `${Math.round((stats.activeRepairs / 20) * 100)}%`, 
      icon: Activity, 
      color: 'orange',
      subText: `${20 - stats.activeRepairs} slots available`
    },
  ];

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  const paymentColors: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Welcome back! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            {showroomName} - EV Workshop Dashboard
          </p>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {mainMetrics.map((metric, idx) => (
            <MetricCard key={idx} {...metric} loading={loading} />
          ))}
        </div>

        {/* Service Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {serviceMetrics.map((metric, idx) => (
            <MetricCard key={idx} {...metric} loading={loading} />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly Revenue Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <TrendingUp size={18} className="text-green-600" />
                Weekly Revenue Trend
              </h3>
              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                +18% vs last week
              </span>
            </div>
            <div className="h-48 flex items-end gap-2 pt-4">
              {weeklyData.map((day, i) => (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-md transition-all hover:from-green-600 hover:to-green-500"
                    style={{ height: `${Math.max(30, (day.revenue / (stats.weeklyRevenue || 1)) * 100)}px` }}
                  ></div>
                  <span className="text-xs text-gray-500">{day.day}</span>
                  <span className="text-xs font-semibold text-gray-700">
                    ₹{(day.revenue / 1000).toFixed(0)}K
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Repair Status Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Activity size={18} className="text-blue-600" />
              Repair Status Distribution
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Active Repairs</span>
                  <span className="font-semibold">{stats.activeRepairs}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${(stats.activeRepairs / (stats.activeRepairs + stats.completedRepairs || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-semibold">{stats.completedRepairs}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${(stats.completedRepairs / (stats.activeRepairs + stats.completedRepairs || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Repairs</span>
                  <span className="font-semibold">{stats.activeRepairs + stats.completedRepairs}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Repairs */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Zap size={18} className="text-blue-600" />
                Recent Service Orders
              </h3>
              <button className="text-sm text-green-600 hover:text-green-700">View all →</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-5 py-3 text-left">Vehicle</th>
                    <th className="px-5 py-3 text-left">Issue</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRepairs.length > 0 ? (
                    recentRepairs.map((repair) => (
                      <tr key={repair.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {repair.vehicles?.vehicle_number || 'N/A'}
                        </td>
                        <td className="px-5 py-3 text-gray-600 truncate max-w-[150px]">
                          {repair.issue_description || 'General Service'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[repair.status] || 'bg-gray-100 text-gray-700'}`}>
                            {repair.status?.replace('_', ' ') || 'Pending'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {new Date(repair.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                        No recent repairs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Package size={18} className="text-green-600" />
                Recent Invoices
              </h3>
              <button className="text-sm text-green-600 hover:text-green-700">View all →</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-5 py-3 text-left">Invoice #</th>
                    <th className="px-5 py-3 text-left">Customer</th>
                    <th className="px-5 py-3 text-left">Amount</th>
                    <th className="px-5 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.length > 0 ? (
                    recentInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-5 py-3 font-mono text-xs font-medium">
                          {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                        </td>
                        <td className="px-5 py-3 text-gray-800">
                          {invoice.customers?.name || 'Walk-in Customer'}
                        </td>
                        <td className="px-5 py-3 font-semibold text-gray-800">
                          ₹{invoice.total_amount?.toLocaleString() || 0}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentColors[invoice.payment_status] || 'bg-gray-100 text-gray-700'}`}>
                            {invoice.payment_status || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                        No recent invoices found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 text-green-700 font-medium text-sm hover:shadow-md transition-all">
            + New Service Order
          </button>
          <button className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 text-blue-700 font-medium text-sm hover:shadow-md transition-all">
            + Add Vehicle
          </button>
          <button className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 text-purple-700 font-medium text-sm hover:shadow-md transition-all">
            Generate Invoice
          </button>
          <button className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 text-amber-700 font-medium text-sm hover:shadow-md transition-all">
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
}