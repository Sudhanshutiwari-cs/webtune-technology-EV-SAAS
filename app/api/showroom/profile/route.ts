import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServiceClient()

    const { data: profile, error } = await supabase
      .from('showroom_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    // If no profile exists, return empty profile template
    if (!profile) {
      return NextResponse.json({
        id: null,
        tenant_id: tenantId,
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        country: '',
        logo_url: '',
        website: '',
      })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id')
    const userRole = request.headers.get('x-user-role')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin and super_admin can update profile
    if (!['admin', 'super_admin'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const data = await request.json()
    const supabase = await createClient()

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('showroom_profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .single()

    if (existingProfile) {
      // Update existing profile
      const { error } = await supabase
        .from('showroom_profiles')
        .update(data)
        .eq('tenant_id', tenantId)

      if (error) {
        console.error('Error updating profile:', error)
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        )
      }
    } else {
      // Create new profile
      const { error } = await supabase
        .from('showroom_profiles')
        .insert({
          tenant_id: tenantId,
          ...data,
        })

      if (error) {
        console.error('Error creating profile:', error)
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { success: true, message: 'Profile updated successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
