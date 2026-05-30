// app/api/customers/route.ts
import { createApiClient } from '@/lib/supabase/api-client'
import { NextRequest, NextResponse } from 'next/server'


function getCurrentShowroomId(request: NextRequest): string | null {
  return request.cookies.get('showroom_id')?.value || null
}

function getCurrentUserId(request: NextRequest): string | null {
  return request.cookies.get('user_id')?.value || null
}

function generateCustomerCode(): string {
  const year = new Date().getFullYear()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `CUST-${year}-${random}`
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient()
    const showroomId = getCurrentShowroomId(request)
    
    if (!showroomId) {
      return NextResponse.json({ error: 'Unauthorized - No showroom found' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const leadStatus = searchParams.get('lead_status')
    const customerStatus = searchParams.get('customer_status')
    const customerType = searchParams.get('customer_type')
    const source = searchParams.get('source')

    const start = (page - 1) * limit
    const end = start + limit - 1

    let query = supabase
      .from('customers')
      .select(`
        *,
        showrooms (showroom_name),
        assigned_sales_executive:showroom_users!customers_assigned_sales_executive_id_fkey (id, full_name, email, mobile_number)
      `, { count: 'exact' })
      .eq('showroom_id', showroomId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,mobile.ilike.%${search}%,email.ilike.%${search}%,customer_code.ilike.%${search}%`)
    }

    if (leadStatus) query = query.eq('lead_status', leadStatus)
    if (customerStatus) query = query.eq('customer_status', customerStatus)
    if (customerType) query = query.eq('customer_type', customerType)
    if (source) query = query.eq('source', source)

    query = query.range(start, end)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error: any) {
    console.error('GET /api/customers error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient()
    const showroomId = getCurrentShowroomId(request)
    const userId = getCurrentUserId(request)
    
    if (!showroomId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const customerCode = generateCustomerCode()
    const referralCode = generateReferralCode()

    const newCustomer = {
      // Basic Info
      customer_code: customerCode,
      showroom_id: showroomId,
      created_by: userId,
      updated_by: userId,
      assigned_sales_executive_id: body.assigned_sales_executive_id || null,
      
      // Personal Info
      first_name: body.first_name,
      last_name: body.last_name || null,
      mobile: body.mobile,
      alternate_mobile: body.alternate_mobile || null,
      email: body.email || null,
      gender: body.gender || null,
      date_of_birth: body.date_of_birth || null,
      profile_image_url: body.profile_image_url || null,
      
      // Government IDs
      aadhaar_number: body.aadhaar_number || null,
      pan_number: body.pan_number || null,
      gst_number: body.gst_number || null,
      driving_license_number: body.driving_license_number || null,
      
      // Customer Type
      customer_type: body.customer_type || 'Individual',
      business_name: body.business_name || null,
      occupation: body.occupation || null,
      annual_income_range: body.annual_income_range || null,
      
      // EV Preferences
      has_home_charging: body.has_home_charging || false,
      charging_capacity_available: body.charging_capacity_available || null,
      is_ev_first_time: body.is_ev_first_time !== undefined ? body.is_ev_first_time : true,
      previous_vehicle_type: body.previous_vehicle_type || null,
      
      // Address
      address_line1: body.address_line1,
      address_line2: body.address_line2 || null,
      city: body.city,
      state: body.state,
      country: body.country || 'India',
      pincode: body.pincode,
      latitude: body.latitude ? parseFloat(body.latitude) : null,
      longitude: body.longitude ? parseFloat(body.longitude) : null,
      
      // Communication
      preferred_language: body.preferred_language || 'English',
      whatsapp_opt_in: body.whatsapp_opt_in !== undefined ? body.whatsapp_opt_in : true,
      sms_opt_in: body.sms_opt_in !== undefined ? body.sms_opt_in : true,
      email_opt_in: body.email_opt_in !== undefined ? body.email_opt_in : true,
      promotional_opt_in: body.promotional_opt_in || false,
      
      // Lead Management
      source: body.source || 'Walk-in',
      referred_by: body.referred_by || null,
      lead_status: body.lead_status || 'New',
      customer_status: body.customer_status || 'Active',
      
      // Dates
      first_contact_date: body.first_contact_date || new Date().toISOString().split('T')[0],
      last_contact_date: body.last_contact_date || null,
      expected_purchase_month: body.expected_purchase_month || null,
      
      // Statistics (defaults)
      total_vehicles_owned: 0,
      total_purchase_amount: 0,
      total_service_count: 0,
      total_service_spent: 0,
      loyalty_points: 0,
      referral_code: referralCode,
      referred_customers_count: 0,
      referral_credits_earned: 0,
      
      // Additional
      notes: body.notes || null,
      tags: body.tags || [],
      
      // Emergency Contact
      emergency_contact_name: body.emergency_contact_name || null,
      emergency_contact_number: body.emergency_contact_number || null,
      emergency_contact_relation: body.emergency_contact_relation || null,
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([newCustomer])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/customers error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}