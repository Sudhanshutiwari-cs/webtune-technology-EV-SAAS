// app/api/sales-executives/route.ts
import { createApiClient } from '@/lib/supabase/api-client'
import { NextRequest, NextResponse } from 'next/server'


export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient()
    
    const { data, error } = await supabase
      .from('showroom_users')
      .select('id, full_name, email, mobile_number, role')
      .eq('role', 'sales_executive')
      .eq('is_active', true)
      .order('full_name')

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error('GET /api/sales-executives error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}