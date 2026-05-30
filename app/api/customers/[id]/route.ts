// app/api/customers/[id]/route.ts - COMPLETE FIXED VERSION

import { createApiClient } from '@/lib/supabase/api-client'
import { NextRequest, NextResponse } from 'next/server'


function getCurrentShowroomId(request: NextRequest): string | null {
  return request.cookies.get('showroom_id')?.value || null
}

function isValidUUID(uuid: string): boolean {
  if (!uuid) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Helper to convert empty string to null for UUID fields
function toNullIfEmpty(value: any): any {
  if (value === '' || value === 'null' || value === 'undefined') {
    return null
  }
  return value
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = createApiClient()
    const showroomId = getCurrentShowroomId(request)
    const params = await context.params
    const customerId = params.id
    
    console.log('GET - Customer ID:', customerId)
    
    if (!customerId || !isValidUUID(customerId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid customer ID' 
      }, { status: 400 })
    }
    
    // Fetch customer with relations
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        *,
        showrooms (*),
        assigned_sales_executive:showroom_users!customers_assigned_sales_executive_id_fkey (
          id,
          full_name,
          email,
          mobile_number
        ),
        customer_vehicles (*),
        sales_invoices (*),
        service_records (*)
      `)
      .eq('id', customerId)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Customer not found' 
      }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: customer })
    
  } catch (error: any) {
    console.error('GET error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = createApiClient()
    const showroomId = getCurrentShowroomId(request)
    const params = await context.params
    const customerId = params.id
    
    console.log('PUT - Customer ID:', customerId)
    
    if (!customerId || !isValidUUID(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }
    
    if (!showroomId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get existing customer
    const { data: existingCustomer, error: checkError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (checkError || !existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (existingCustomer.showroom_id !== showroomId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    
    // Clean up UUID fields - convert empty strings to null
    const assignedSalesExecutiveId = toNullIfEmpty(body.assigned_sales_executive_id)
    
    // Validate assigned_sales_executive_id is a valid UUID if not null
    if (assignedSalesExecutiveId && !isValidUUID(assignedSalesExecutiveId)) {
      return NextResponse.json({ error: 'Invalid sales executive ID' }, { status: 400 })
    }
    
    // Validate mobile if changed
    if (body.mobile && body.mobile !== existingCustomer.mobile) {
      if (!/^[0-9]{10}$/.test(body.mobile)) {
        return NextResponse.json({ error: 'Mobile number must be 10 digits' }, { status: 400 })
      }
      
      const { data: mobileCheck } = await supabase
        .from('customers')
        .select('id')
        .eq('mobile', body.mobile)
        .eq('showroom_id', showroomId)
        .is('deleted_at', null)
        .neq('id', customerId)
      
      if (mobileCheck && mobileCheck.length > 0) {
        return NextResponse.json({ error: 'Mobile number already exists' }, { status: 400 })
      }
    }
    
    // Clean up all fields - convert empty strings to null where appropriate
    const updateData = {
      first_name: body.first_name,
      last_name: toNullIfEmpty(body.last_name),
      mobile: body.mobile,
      alternate_mobile: toNullIfEmpty(body.alternate_mobile),
      email: toNullIfEmpty(body.email),
      gender: toNullIfEmpty(body.gender),
      date_of_birth: toNullIfEmpty(body.date_of_birth),
      profile_image_url: toNullIfEmpty(body.profile_image_url),
      aadhaar_number: toNullIfEmpty(body.aadhaar_number),
      pan_number: toNullIfEmpty(body.pan_number),
      gst_number: toNullIfEmpty(body.gst_number),
      driving_license_number: toNullIfEmpty(body.driving_license_number),
      customer_type: body.customer_type || 'Individual',
      business_name: toNullIfEmpty(body.business_name),
      occupation: toNullIfEmpty(body.occupation),
      annual_income_range: toNullIfEmpty(body.annual_income_range),
      has_home_charging: body.has_home_charging || false,
      charging_capacity_available: toNullIfEmpty(body.charging_capacity_available),
      is_ev_first_time: body.is_ev_first_time !== undefined ? body.is_ev_first_time : true,
      previous_vehicle_type: toNullIfEmpty(body.previous_vehicle_type),
      address_line1: body.address_line1,
      address_line2: toNullIfEmpty(body.address_line2),
      city: body.city,
      state: body.state,
      country: body.country || 'India',
      pincode: body.pincode,
      latitude: body.latitude ? parseFloat(body.latitude) : null,
      longitude: body.longitude ? parseFloat(body.longitude) : null,
      preferred_language: body.preferred_language || 'English',
      whatsapp_opt_in: body.whatsapp_opt_in !== undefined ? body.whatsapp_opt_in : true,
      sms_opt_in: body.sms_opt_in !== undefined ? body.sms_opt_in : true,
      email_opt_in: body.email_opt_in !== undefined ? body.email_opt_in : true,
      promotional_opt_in: body.promotional_opt_in || false,
      source: body.source || 'Walk-in',
      referred_by: toNullIfEmpty(body.referred_by),
      lead_status: body.lead_status || 'New',
      customer_status: body.customer_status || 'Active',
      first_contact_date: toNullIfEmpty(body.first_contact_date),
      last_contact_date: toNullIfEmpty(body.last_contact_date),
      expected_purchase_month: toNullIfEmpty(body.expected_purchase_month),
      notes: toNullIfEmpty(body.notes),
      tags: body.tags || [],
      emergency_contact_name: toNullIfEmpty(body.emergency_contact_name),
      emergency_contact_number: toNullIfEmpty(body.emergency_contact_number),
      emergency_contact_relation: toNullIfEmpty(body.emergency_contact_relation),
      assigned_sales_executive_id: assignedSalesExecutiveId,
      updated_at: new Date().toISOString(),
    }
    
    console.log('Update Data:', updateData)
    
    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('PUT error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = createApiClient()
    const showroomId = getCurrentShowroomId(request)
    const params = await context.params
    const customerId = params.id
    
    if (!customerId || !isValidUUID(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }
    
    if (!showroomId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, showroom_id, deleted_at')
      .eq('id', customerId)
      .single()

    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (existingCustomer.deleted_at) {
      return NextResponse.json({ error: 'Customer already deleted' }, { status: 400 })
    }

    if (existingCustomer.showroom_id !== showroomId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('customers')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Customer deleted successfully' })
  } catch (error: any) {
    console.error('DELETE error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}