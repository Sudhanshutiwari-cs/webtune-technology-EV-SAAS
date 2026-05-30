// app/api/customers-stats/route.ts
import { createApiClient } from '@/lib/supabase/api-client'
import { NextRequest, NextResponse } from 'next/server'


function getCurrentShowroomId(request: NextRequest): string | null {
  return request.cookies.get('showroom_id')?.value || null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient()
    const showroomId = getCurrentShowroomId(request)
    
    if (!showroomId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { count: total } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('showroom_id', showroomId)
      .is('deleted_at', null)

    const { count: active } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('showroom_id', showroomId)
      .eq('customer_status', 'Active')
      .is('deleted_at', null)

    const { count: vip } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('showroom_id', showroomId)
      .eq('customer_status', 'VIP')
      .is('deleted_at', null)

    const { count: converted } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('showroom_id', showroomId)
      .eq('lead_status', 'Converted')
      .is('deleted_at', null)

    const { data: loyaltyData } = await supabase
      .from('customers')
      .select('loyalty_points')
      .eq('showroom_id', showroomId)
      .is('deleted_at', null)

    const totalLoyaltyPoints = loyaltyData?.reduce((sum, c) => sum + (c.loyalty_points || 0), 0) || 0

    const { data: vehiclesData } = await supabase
      .from('customers')
      .select('total_vehicles_owned')
      .eq('showroom_id', showroomId)
      .is('deleted_at', null)

    const totalVehicles = vehiclesData?.reduce((sum, c) => sum + (c.total_vehicles_owned || 0), 0) || 0

    return NextResponse.json({
      success: true,
      stats: {
        total: total || 0,
        active: active || 0,
        vip: vip || 0,
        converted: converted || 0,
        totalLoyaltyPoints,
        totalVehicles
      }
    })
  } catch (error: any) {
    console.error('GET /api/customers-stats error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}