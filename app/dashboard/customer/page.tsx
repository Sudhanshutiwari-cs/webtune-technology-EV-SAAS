// app/customers/page.tsx - With blur effect on modals

'use client';

import { apiClient } from '@/lib/supabase/api-client';
import { useState, useEffect, useCallback, useMemo } from 'react';

// Types
interface Customer {
  id: string;
  customer_code: string;
  first_name: string;
  last_name: string | null;
  mobile: string;
  alternate_mobile: string | null;
  email: string | null;
  gender: 'Male' | 'Female' | 'Other' | null;
  date_of_birth: string | null;
  customer_type: 'Individual' | 'Corporate' | 'Dealer' | 'Fleet Operator' | 'Government';
  business_name: string | null;
  occupation: string | null;
  annual_income_range: string | null;
  has_home_charging: boolean;
  charging_capacity_available: string | null;
  is_ev_first_time: boolean;
  previous_vehicle_type: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  preferred_language: string;
  whatsapp_opt_in: boolean;
  sms_opt_in: boolean;
  email_opt_in: boolean;
  promotional_opt_in: boolean;
  source: string | null;
  referred_by: string | null;
  lead_status: string;
  customer_status: string;
  first_contact_date: string | null;
  last_contact_date: string | null;
  expected_purchase_month: string | null;
  total_vehicles_owned: number;
  total_purchase_amount: number;
  loyalty_points: number;
  referral_code: string | null;
  notes: string | null;
  tags: string[];
  aadhaar_number: string | null;
  pan_number: string | null;
  gst_number: string | null;
  driving_license_number: string | null;
  profile_image_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  emergency_contact_relation: string | null;
  assigned_sales_executive_id: string | null;
  assigned_sales_executive?: { full_name: string };
  created_at: string;
  updated_at: string;
  latitude?: number;
  longitude?: number;
}

interface SalesExecutive {
  id: string;
  full_name: string;
  email: string;
  mobile_number: string;
}

// Toast Component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2`}>
        <span>
          {type === 'success' && '✓'}
          {type === 'error' && '✗'}
          {type === 'info' && 'ℹ'}
        </span>
        <span>{message}</span>
      </div>
    </div>
  );
};

// StatusBadge Component
const StatusBadge = ({ status, type }: { status: string; type: 'lead' | 'customer' }) => {
  const leadColors: Record<string, string> = {
    New: 'bg-blue-100 text-blue-800',
    Contacted: 'bg-purple-100 text-purple-800',
    Interested: 'bg-indigo-100 text-indigo-800',
    'Test Ride Done': 'bg-cyan-100 text-cyan-800',
    Negotiation: 'bg-orange-100 text-orange-800',
    Converted: 'bg-green-100 text-green-800',
    Lost: 'bg-red-100 text-red-800',
    'Follow-up': 'bg-pink-100 text-pink-800',
  };
  
  const customerColors: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Inactive: 'bg-gray-100 text-gray-800',
    Blocked: 'bg-red-100 text-red-800',
    VIP: 'bg-yellow-100 text-yellow-800',
  };

  const colors = type === 'lead' ? leadColors : customerColors;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
      ))}
    </div>
    <div className="h-96 bg-gray-100 rounded-lg animate-pulse"></div>
  </div>
);

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    vip: 0,
    converted: 0,
    totalLoyaltyPoints: 0,
    totalVehicles: 0
  });
  const [salesExecutives, setSalesExecutives] = useState<SalesExecutive[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [filters, setFilters] = useState({
    lead_status: '',
    customer_status: '',
    customer_type: '',
    source: '',
  });

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
    alternate_mobile: '',
    email: '',
    gender: '',
    date_of_birth: '',
    profile_image_url: '',
    aadhaar_number: '',
    pan_number: '',
    gst_number: '',
    driving_license_number: '',
    customer_type: 'Individual',
    business_name: '',
    occupation: '',
    annual_income_range: '',
    has_home_charging: false,
    charging_capacity_available: '',
    is_ev_first_time: true,
    previous_vehicle_type: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    latitude: '',
    longitude: '',
    preferred_language: 'English',
    whatsapp_opt_in: true,
    sms_opt_in: true,
    email_opt_in: true,
    promotional_opt_in: false,
    source: 'Walk-in',
    referred_by: '',
    lead_status: 'New',
    customer_status: 'Active',
    first_contact_date: new Date().toISOString().split('T')[0],
    last_contact_date: '',
    expected_purchase_month: '',
    notes: '',
    tags: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    emergency_contact_relation: '',
    assigned_sales_executive_id: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal || showDetailModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal, showDetailModal]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        loadCustomers();
      } else {
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadCustomers();
    loadStats();
    loadSalesExecutives();
  }, [currentPage, filters]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      if (searchTerm) params.append('search', searchTerm);
      if (filters.lead_status) params.append('lead_status', filters.lead_status);
      if (filters.customer_status) params.append('customer_status', filters.customer_status);
      if (filters.customer_type) params.append('customer_type', filters.customer_type);
      if (filters.source) params.append('source', filters.source);

      const result = await apiClient.get(`/api/customers?${params}`);
      if (result.success) {
        setCustomers(result.data);
        setTotalPages(result.totalPages);
        setTotalCustomers(result.total);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      showToast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filters]);

  const loadStats = useCallback(async () => {
    try {
      const result = await apiClient.get('/api/customers-stats');
      if (result.success) setStats(result.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  const loadSalesExecutives = useCallback(async () => {
    try {
      const result = await apiClient.get('/api/sales-executives');
      if (result.success) setSalesExecutives(result.data);
    } catch (error) {
      console.error('Error loading sales executives:', error);
    }
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.first_name?.trim()) errors.first_name = 'First name is required';
    if (!formData.mobile?.trim()) errors.mobile = 'Mobile number is required';
    else if (!/^[0-9]{10}$/.test(formData.mobile)) errors.mobile = 'Mobile must be 10 digits';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email';
    if (!formData.address_line1?.trim()) errors.address_line1 = 'Address is required';
    if (!formData.city?.trim()) errors.city = 'City is required';
    if (!formData.state?.trim()) errors.state = 'State is required';
    if (!formData.pincode?.trim()) errors.pincode = 'Pincode is required';
    else if (!/^[0-9]{6}$/.test(formData.pincode)) errors.pincode = 'Pincode must be 6 digits';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      mobile: '',
      alternate_mobile: '',
      email: '',
      gender: '',
      date_of_birth: '',
      profile_image_url: '',
      aadhaar_number: '',
      pan_number: '',
      gst_number: '',
      driving_license_number: '',
      customer_type: 'Individual',
      business_name: '',
      occupation: '',
      annual_income_range: '',
      has_home_charging: false,
      charging_capacity_available: '',
      is_ev_first_time: true,
      previous_vehicle_type: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      latitude: '',
      longitude: '',
      preferred_language: 'English',
      whatsapp_opt_in: true,
      sms_opt_in: true,
      email_opt_in: true,
      promotional_opt_in: false,
      source: 'Walk-in',
      referred_by: '',
      lead_status: 'New',
      customer_status: 'Active',
      first_contact_date: new Date().toISOString().split('T')[0],
      last_contact_date: '',
      expected_purchase_month: '',
      notes: '',
      tags: '',
      emergency_contact_name: '',
      emergency_contact_number: '',
      emergency_contact_relation: '',
      assigned_sales_executive_id: '',
    });
    setFormErrors({});
  };

  const prepareSubmitData = (data: typeof formData) => {
    return {
      ...data,
      assigned_sales_executive_id: data.assigned_sales_executive_id === '' ? null : data.assigned_sales_executive_id,
      alternate_mobile: data.alternate_mobile === '' ? null : data.alternate_mobile,
      email: data.email === '' ? null : data.email,
      gender: data.gender === '' ? null : data.gender,
      date_of_birth: data.date_of_birth === '' ? null : data.date_of_birth,
      business_name: data.business_name === '' ? null : data.business_name,
      occupation: data.occupation === '' ? null : data.occupation,
      annual_income_range: data.annual_income_range === '' ? null : data.annual_income_range,
      aadhaar_number: data.aadhaar_number === '' ? null : data.aadhaar_number,
      pan_number: data.pan_number === '' ? null : data.pan_number,
      gst_number: data.gst_number === '' ? null : data.gst_number,
      driving_license_number: data.driving_license_number === '' ? null : data.driving_license_number,
      charging_capacity_available: data.charging_capacity_available === '' ? null : data.charging_capacity_available,
      previous_vehicle_type: data.previous_vehicle_type === '' ? null : data.previous_vehicle_type,
      referred_by: data.referred_by === '' ? null : data.referred_by,
      notes: data.notes === '' ? null : data.notes,
      emergency_contact_name: data.emergency_contact_name === '' ? null : data.emergency_contact_name,
      emergency_contact_number: data.emergency_contact_number === '' ? null : data.emergency_contact_number,
      emergency_contact_relation: data.emergency_contact_relation === '' ? null : data.emergency_contact_relation,
      latitude: data.latitude === '' ? null : parseFloat(data.latitude),
      longitude: data.longitude === '' ? null : parseFloat(data.longitude),
      profile_image_url: data.profile_image_url === '' ? null : data.profile_image_url,
      tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
    };
  };

  const createCustomer = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const submitData = prepareSubmitData(formData);
      const result = await apiClient.post('/api/customers', submitData);
      if (result.success) {
        await loadCustomers();
        await loadStats();
        setShowModal(false);
        resetForm();
        showToast('Customer created successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to create customer', 'error');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      showToast('Failed to create customer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCustomer = async () => {
    if (!editingCustomer || !validateForm()) return;
    setIsSubmitting(true);
    try {
      const submitData = prepareSubmitData(formData);
      const result = await apiClient.put(`/api/customers/${editingCustomer.id}`, submitData);
      if (result.success) {
        await loadCustomers();
        setShowModal(false);
        setEditingCustomer(null);
        resetForm();
        showToast('Customer updated successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to update customer', 'error');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      showToast('Failed to update customer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      const result = await apiClient.delete(`/api/customers/${customerId}`);
      if (result.success) {
        await loadCustomers();
        await loadStats();
        showToast('Customer deleted successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to delete customer', 'error');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      showToast('Failed to delete customer', 'error');
    }
  };

  const viewCustomer = async (customerId: string) => {
    try {
      const result = await apiClient.get(`/api/customers/${customerId}`);
      if (result.success) {
        setSelectedCustomer(result.data);
        setShowDetailModal(true);
      } else {
        showToast(result.error || 'Failed to load customer details', 'error');
      }
    } catch (error) {
      console.error('Error viewing customer:', error);
      showToast('Failed to load customer details', 'error');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      first_name: customer.first_name,
      last_name: customer.last_name || '',
      mobile: customer.mobile,
      alternate_mobile: customer.alternate_mobile || '',
      email: customer.email || '',
      gender: customer.gender || '',
      date_of_birth: customer.date_of_birth?.split('T')[0] || '',
      profile_image_url: customer.profile_image_url || '',
      aadhaar_number: customer.aadhaar_number || '',
      pan_number: customer.pan_number || '',
      gst_number: customer.gst_number || '',
      driving_license_number: customer.driving_license_number || '',
      customer_type: customer.customer_type,
      business_name: customer.business_name || '',
      occupation: customer.occupation || '',
      annual_income_range: customer.annual_income_range || '',
      has_home_charging: customer.has_home_charging,
      charging_capacity_available: customer.charging_capacity_available || '',
      is_ev_first_time: customer.is_ev_first_time,
      previous_vehicle_type: customer.previous_vehicle_type || '',
      address_line1: customer.address_line1,
      address_line2: customer.address_line2 || '',
      city: customer.city,
      state: customer.state,
      country: customer.country,
      pincode: customer.pincode,
      latitude: customer.latitude?.toString() || '',
      longitude: customer.longitude?.toString() || '',
      preferred_language: customer.preferred_language,
      whatsapp_opt_in: customer.whatsapp_opt_in,
      sms_opt_in: customer.sms_opt_in,
      email_opt_in: customer.email_opt_in,
      promotional_opt_in: customer.promotional_opt_in,
      source: customer.source || 'Walk-in',
      referred_by: customer.referred_by || '',
      lead_status: customer.lead_status,
      customer_status: customer.customer_status,
      first_contact_date: customer.first_contact_date || '',
      last_contact_date: customer.last_contact_date || '',
      expected_purchase_month: customer.expected_purchase_month || '',
      notes: customer.notes || '',
      tags: Array.isArray(customer.tags) ? customer.tags.join(', ') : '',
      emergency_contact_name: customer.emergency_contact_name || '',
      emergency_contact_number: customer.emergency_contact_number || '',
      emergency_contact_relation: customer.emergency_contact_relation || '',
      assigned_sales_executive_id: customer.assigned_sales_executive_id || '',
    });
    setShowModal(true);
  };

  const tabs = useMemo(() => ['basic', 'government', 'ev', 'address', 'communication', 'lead', 'emergency'], []);

  if (loading && customers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header - Normal scrolling */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage customers, track leads, and view purchase history</p>
            </div>
            <button
              onClick={() => { resetForm(); setEditingCustomer(null); setShowModal(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">VIP</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.vip}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">Converted</p>
            <p className="text-2xl font-bold text-purple-600">{stats.converted}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">Loyalty Points</p>
            <p className="text-2xl font-bold text-orange-600">{stats.totalLoyaltyPoints.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">Vehicles</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.totalVehicles}</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by name, mobile, email, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            Filters {Object.values(filters).some(f => f) && '●'}
          </button>
          <button 
            onClick={loadCustomers} 
            className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            ⟳
          </button>
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-lg border mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
            <select value={filters.lead_status} onChange={(e) => setFilters({ ...filters, lead_status: e.target.value })} className="border rounded px-3 py-2">
              <option value="">All Lead Status</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Interested">Interested</option>
              <option value="Test Ride Done">Test Ride Done</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
              <option value="Follow-up">Follow-up</option>
            </select>
            <select value={filters.customer_status} onChange={(e) => setFilters({ ...filters, customer_status: e.target.value })} className="border rounded px-3 py-2">
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Blocked">Blocked</option>
              <option value="VIP">VIP</option>
            </select>
            <select value={filters.customer_type} onChange={(e) => setFilters({ ...filters, customer_type: e.target.value })} className="border rounded px-3 py-2">
              <option value="">All Types</option>
              <option value="Individual">Individual</option>
              <option value="Corporate">Corporate</option>
              <option value="Dealer">Dealer</option>
              <option value="Fleet Operator">Fleet Operator</option>
              <option value="Government">Government</option>
            </select>
            <select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })} className="border rounded px-3 py-2">
              <option value="">All Sources</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Website">Website</option>
              <option value="Facebook">Facebook</option>
              <option value="Instagram">Instagram</option>
              <option value="Google">Google</option>
              <option value="Referral">Referral</option>
              <option value="Test Ride">Test Ride</option>
              <option value="EV Expo">EV Expo</option>
            </select>
          </div>
        )}

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type/Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Executive</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicles</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">Loading customers...</p>
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{customer.first_name} {customer.last_name || ''}</div>
                        <div className="text-sm text-gray-500">Code: {customer.customer_code}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{customer.mobile}</div>
                        <div className="text-sm text-gray-500">{customer.email || 'No email'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm mb-1">{customer.customer_type}</div>
                        <StatusBadge status={customer.customer_status} type="customer" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{customer.city}</div>
                        <div className="text-sm text-gray-500">{customer.state}</div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={customer.lead_status} type="lead" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{customer.assigned_sales_executive?.full_name || 'Unassigned'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{customer.total_vehicles_owned || 0} vehicles</div>
                        <div className="text-sm text-gray-500">₹{(customer.total_purchase_amount || 0).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button onClick={() => viewCustomer(customer.id)} className="text-blue-600 hover:text-blue-800 transition-colors" title="View">👁️</button>
                          <button onClick={() => handleEdit(customer)} className="text-green-600 hover:text-green-800 transition-colors" title="Edit">✏️</button>
                          <button onClick={() => deleteCustomer(customer.id)} className="text-red-600 hover:text-red-800 transition-colors" title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && customers.length > 0 && (
            <div className="px-6 py-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCustomers)} of {totalCustomers} customers
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Form Modal - WITH BLUR EFFECT */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-fade-in">
            <div className="flex-shrink-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button 
                onClick={() => { setShowModal(false); setEditingCustomer(null); resetForm(); }} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {/* Tabs */}
              <div className="border-b mb-6">
                <div className="flex flex-wrap gap-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 font-medium capitalize transition-colors ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); editingCustomer ? updateCustomer() : createCustomer(); }}>
                {/* Basic Information Tab */}
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">First Name *</label>
                      <input type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.first_name ? 'border-red-500' : 'border-gray-300'}`} />
                      {formErrors.first_name && <p className="text-red-500 text-xs mt-1">{formErrors.first_name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Last Name</label>
                      <input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Mobile *</label>
                      <input type="tel" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.mobile ? 'border-red-500' : 'border-gray-300'}`} />
                      {formErrors.mobile && <p className="text-red-500 text-xs mt-1">{formErrors.mobile}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Alternate Mobile</label>
                      <input type="tel" value={formData.alternate_mobile} onChange={(e) => setFormData({...formData, alternate_mobile: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`} />
                      {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Gender</label>
                      <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date of Birth</label>
                      <input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Customer Type</label>
                      <select value={formData.customer_type} onChange={(e) => setFormData({...formData, customer_type: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="Individual">Individual</option>
                        <option value="Corporate">Corporate</option>
                        <option value="Dealer">Dealer</option>
                        <option value="Fleet Operator">Fleet Operator</option>
                        <option value="Government">Government</option>
                      </select>
                    </div>
                    {formData.customer_type !== 'Individual' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Business Name</label>
                        <input type="text" value={formData.business_name} onChange={(e) => setFormData({...formData, business_name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1">Occupation</label>
                      <input type="text" value={formData.occupation} onChange={(e) => setFormData({...formData, occupation: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Annual Income Range</label>
                      <select value={formData.annual_income_range} onChange={(e) => setFormData({...formData, annual_income_range: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select</option>
                        <option value="< 3 Lakhs">&lt; 3 Lakhs</option>
                        <option value="3-5 Lakhs">3-5 Lakhs</option>
                        <option value="5-10 Lakhs">5-10 Lakhs</option>
                        <option value="10-20 Lakhs">10-20 Lakhs</option>
                        <option value="> 20 Lakhs">&gt; 20 Lakhs</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Profile Image URL</label>
                      <input type="text" value={formData.profile_image_url} onChange={(e) => setFormData({...formData, profile_image_url: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." />
                    </div>
                  </div>
                )}

                {/* Government IDs Tab */}
                {activeTab === 'government' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Aadhaar Number</label><input type="text" value={formData.aadhaar_number} onChange={(e) => setFormData({...formData, aadhaar_number: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="12 digit number" /></div>
                    <div><label className="block text-sm font-medium mb-1">PAN Number</label><input type="text" value={formData.pan_number} onChange={(e) => setFormData({...formData, pan_number: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ABCDE1234F" /></div>
                    <div><label className="block text-sm font-medium mb-1">GST Number</label><input type="text" value={formData.gst_number} onChange={(e) => setFormData({...formData, gst_number: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="22AAAAA0000A1Z" /></div>
                    <div><label className="block text-sm font-medium mb-1">Driving License Number</label><input type="text" value={formData.driving_license_number} onChange={(e) => setFormData({...formData, driving_license_number: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                  </div>
                )}

                {/* EV Preferences Tab */}
                {activeTab === 'ev' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-center"><input type="checkbox" checked={formData.has_home_charging} onChange={(e) => setFormData({...formData, has_home_charging: e.target.checked})} className="mr-2 rounded" /> Has Home Charging Setup</label>
                      <label className="flex items-center"><input type="checkbox" checked={formData.is_ev_first_time} onChange={(e) => setFormData({...formData, is_ev_first_time: e.target.checked})} className="mr-2 rounded" /> First Time EV Buyer</label>
                    </div>
                    <div><label className="block text-sm font-medium mb-1">Charging Capacity Available</label><input type="text" value={formData.charging_capacity_available} onChange={(e) => setFormData({...formData, charging_capacity_available: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., 3.3kW, 7.4kW" /></div>
                    <div><label className="block text-sm font-medium mb-1">Previous Vehicle Type</label><input type="text" value={formData.previous_vehicle_type} onChange={(e) => setFormData({...formData, previous_vehicle_type: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Petrol, Diesel, CNG, etc." /></div>
                  </div>
                )}

                {/* Address Tab */}
                {activeTab === 'address' && (
                  <div className="space-y-4">
                    <div><label className="block text-sm font-medium mb-1">Address Line 1 *</label><input type="text" value={formData.address_line1} onChange={(e) => setFormData({...formData, address_line1: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.address_line1 ? 'border-red-500' : 'border-gray-300'}`} />{formErrors.address_line1 && <p className="text-red-500 text-xs mt-1">{formErrors.address_line1}</p>}</div>
                    <div><label className="block text-sm font-medium mb-1">Address Line 2</label><input type="text" value={formData.address_line2} onChange={(e) => setFormData({...formData, address_line2: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><label className="block text-sm font-medium mb-1">City *</label><input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.city ? 'border-red-500' : 'border-gray-300'}`} />{formErrors.city && <p className="text-red-500 text-xs mt-1">{formErrors.city}</p>}</div>
                      <div><label className="block text-sm font-medium mb-1">State *</label><input type="text" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.state ? 'border-red-500' : 'border-gray-300'}`} />{formErrors.state && <p className="text-red-500 text-xs mt-1">{formErrors.state}</p>}</div>
                      <div><label className="block text-sm font-medium mb-1">Pincode *</label><input type="text" value={formData.pincode} onChange={(e) => setFormData({...formData, pincode: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.pincode ? 'border-red-500' : 'border-gray-300'}`} />{formErrors.pincode && <p className="text-red-500 text-xs mt-1">{formErrors.pincode}</p>}</div>
                    </div>
                    <div><label className="block text-sm font-medium mb-1">Country</label><input type="text" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Latitude</label><input type="text" value={formData.latitude} onChange={(e) => setFormData({...formData, latitude: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                      <div><label className="block text-sm font-medium mb-1">Longitude</label><input type="text" value={formData.longitude} onChange={(e) => setFormData({...formData, longitude: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    </div>
                  </div>
                )}

                {/* Communication Tab */}
                {activeTab === 'communication' && (
                  <div className="space-y-4">
                    <div><label className="block text-sm font-medium mb-1">Preferred Language</label>
                      <select value={formData.preferred_language} onChange={(e) => setFormData({...formData, preferred_language: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Telugu">Telugu</option>
                        <option value="Kannada">Kannada</option>
                        <option value="Malayalam">Malayalam</option>
                        <option value="Marathi">Marathi</option>
                        <option value="Gujarati">Gujarati</option>
                        <option value="Bengali">Bengali</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center"><input type="checkbox" checked={formData.whatsapp_opt_in} onChange={(e) => setFormData({...formData, whatsapp_opt_in: e.target.checked})} className="mr-2 rounded" /> WhatsApp Opt-in</label>
                      <label className="flex items-center"><input type="checkbox" checked={formData.sms_opt_in} onChange={(e) => setFormData({...formData, sms_opt_in: e.target.checked})} className="mr-2 rounded" /> SMS Opt-in</label>
                      <label className="flex items-center"><input type="checkbox" checked={formData.email_opt_in} onChange={(e) => setFormData({...formData, email_opt_in: e.target.checked})} className="mr-2 rounded" /> Email Opt-in</label>
                      <label className="flex items-center"><input type="checkbox" checked={formData.promotional_opt_in} onChange={(e) => setFormData({...formData, promotional_opt_in: e.target.checked})} className="mr-2 rounded" /> Promotional Opt-in</label>
                    </div>
                  </div>
                )}

                {/* Lead Management Tab */}
                {activeTab === 'lead' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Lead Source</label>
                        <select value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="Walk-in">Walk-in</option>
                          <option value="Website">Website</option>
                          <option value="Facebook">Facebook</option>
                          <option value="Instagram">Instagram</option>
                          <option value="Google">Google</option>
                          <option value="Referral">Referral</option>
                          <option value="Test Ride">Test Ride</option>
                          <option value="EV Expo">EV Expo</option>
                          <option value="Cold Call">Cold Call</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div><label className="block text-sm font-medium mb-1">Lead Status</label>
                        <select value={formData.lead_status} onChange={(e) => setFormData({...formData, lead_status: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Interested">Interested</option>
                          <option value="Test Ride Done">Test Ride Done</option>
                          <option value="Negotiation">Negotiation</option>
                          <option value="Converted">Converted</option>
                          <option value="Lost">Lost</option>
                          <option value="Follow-up">Follow-up</option>
                        </select>
                      </div>
                      <div><label className="block text-sm font-medium mb-1">Customer Status</label>
                        <select value={formData.customer_status} onChange={(e) => setFormData({...formData, customer_status: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Blocked">Blocked</option>
                          <option value="VIP">VIP</option>
                        </select>
                      </div>
                      <div><label className="block text-sm font-medium mb-1">Assigned Sales Executive</label>
                        <select value={formData.assigned_sales_executive_id} onChange={(e) => setFormData({...formData, assigned_sales_executive_id: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Unassigned</option>
                          {salesExecutives.map(exec => (<option key={exec.id} value={exec.id}>{exec.full_name}</option>))}
                        </select>
                      </div>
                      <div><label className="block text-sm font-medium mb-1">Referred By</label><input type="text" value={formData.referred_by} onChange={(e) => setFormData({...formData, referred_by: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Customer code or name" /></div>
                      <div><label className="block text-sm font-medium mb-1">Expected Purchase Month</label><input type="month" value={formData.expected_purchase_month} onChange={(e) => setFormData({...formData, expected_purchase_month: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    </div>
                    <div><label className="block text-sm font-medium mb-1">Notes</label><textarea rows={3} value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Additional notes..." /></div>
                    <div><label className="block text-sm font-medium mb-1">Tags</label><input type="text" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Comma separated tags" /></div>
                  </div>
                )}

                {/* Emergency Contact Tab */}
                {activeTab === 'emergency' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Emergency Contact Name</label><input type="text" value={formData.emergency_contact_name} onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-sm font-medium mb-1">Emergency Contact Number</label><input type="tel" value={formData.emergency_contact_number} onChange={(e) => setFormData({...formData, emergency_contact_number: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-sm font-medium mb-1">Emergency Contact Relation</label><input type="text" value={formData.emergency_contact_relation} onChange={(e) => setFormData({...formData, emergency_contact_relation: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Spouse, Father, Mother, etc." /></div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="sticky bottom-0 bg-white border-t mt-6 pt-4 flex justify-end space-x-3">
                  <button type="button" onClick={() => { setShowModal(false); setEditingCustomer(null); resetForm(); }} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Create Customer')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal - WITH BLUR EFFECT */}
      {showDetailModal && selectedCustomer && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
            <div className="flex-shrink-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold">Customer Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">{selectedCustomer.first_name} {selectedCustomer.last_name || ''}</h3>
                  <p className="text-gray-500">Code: {selectedCustomer.customer_code}</p>
                  <p className="text-gray-500">Referral: {selectedCustomer.referral_code}</p>
                </div>
                <div className="flex space-x-2">
                  <StatusBadge status={selectedCustomer.customer_status} type="customer" />
                  <StatusBadge status={selectedCustomer.lead_status} type="lead" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1">Personal Info</h4>
                  <p><strong>Mobile:</strong> {selectedCustomer.mobile}</p>
                  {selectedCustomer.alternate_mobile && <p><strong>Alternate:</strong> {selectedCustomer.alternate_mobile}</p>}
                  {selectedCustomer.email && <p><strong>Email:</strong> {selectedCustomer.email}</p>}
                  {selectedCustomer.gender && <p><strong>Gender:</strong> {selectedCustomer.gender}</p>}
                  {selectedCustomer.date_of_birth && <p><strong>DOB:</strong> {new Date(selectedCustomer.date_of_birth).toLocaleDateString()}</p>}
                  <p><strong>Occupation:</strong> {selectedCustomer.occupation || 'N/A'}</p>
                  <p><strong>Income:</strong> {selectedCustomer.annual_income_range || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1">Business Info</h4>
                  <p><strong>Type:</strong> {selectedCustomer.customer_type}</p>
                  {selectedCustomer.business_name && <p><strong>Business:</strong> {selectedCustomer.business_name}</p>}
                  {selectedCustomer.gst_number && <p><strong>GST:</strong> {selectedCustomer.gst_number}</p>}
                  {selectedCustomer.pan_number && <p><strong>PAN:</strong> {selectedCustomer.pan_number}</p>}
                  {selectedCustomer.aadhaar_number && <p><strong>Aadhaar:</strong> {selectedCustomer.aadhaar_number}</p>}
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1">Address</h4>
                  <p>{selectedCustomer.address_line1}</p>
                  {selectedCustomer.address_line2 && <p>{selectedCustomer.address_line2}</p>}
                  <p>{selectedCustomer.city}, {selectedCustomer.state} - {selectedCustomer.pincode}</p>
                  <p>{selectedCustomer.country}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1">EV Preferences</h4>
                  <p><strong>First Time EV:</strong> {selectedCustomer.is_ev_first_time ? 'Yes' : 'No'}</p>
                  <p><strong>Home Charging:</strong> {selectedCustomer.has_home_charging ? 'Yes' : 'No'}</p>
                  {selectedCustomer.charging_capacity_available && <p><strong>Charging Capacity:</strong> {selectedCustomer.charging_capacity_available}</p>}
                  {selectedCustomer.previous_vehicle_type && <p><strong>Previous Vehicle:</strong> {selectedCustomer.previous_vehicle_type}</p>}
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1">Statistics</h4>
                  <p><strong>Vehicles Owned:</strong> {selectedCustomer.total_vehicles_owned || 0}</p>
                  <p><strong>Total Purchase:</strong> ₹{(selectedCustomer.total_purchase_amount || 0).toLocaleString()}</p>
                  <p><strong>Loyalty Points:</strong> {selectedCustomer.loyalty_points || 0}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1">Emergency Contact</h4>
                  {selectedCustomer.emergency_contact_name ? (
                    <>
                      <p><strong>Name:</strong> {selectedCustomer.emergency_contact_name}</p>
                      <p><strong>Number:</strong> {selectedCustomer.emergency_contact_number}</p>
                      <p><strong>Relation:</strong> {selectedCustomer.emergency_contact_relation}</p>
                    </>
                  ) : <p>No emergency contact saved</p>}
                </div>
              </div>
              {selectedCustomer.notes && (
                <div className="mt-4">
                  <h4 className="font-semibold border-b pb-1">Notes</h4>
                  <p className="mt-2">{selectedCustomer.notes}</p>
                </div>
              )}
              <div className="text-sm text-gray-500 border-t mt-4 pt-4">
                <p>Created: {new Date(selectedCustomer.created_at).toLocaleString()}</p>
                <p>Last Updated: {new Date(selectedCustomer.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}