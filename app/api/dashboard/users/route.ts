import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id')
    const userRole = request.headers.get('x-user-role')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin and super_admin can view users
    if (!['admin', 'super_admin'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone_number, role, is_active, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    return NextResponse.json(users)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id')
    const userRole = request.headers.get('x-user-role')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin and super_admin can create users
    if (!['admin', 'super_admin'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { email, first_name, last_name, phone_number, role } = await request.json()

    if (!email || !first_name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(2, 12)
    const { hashPassword } = await import('@/lib/auth')
    const passwordHash = await hashPassword(tempPassword)

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        tenant_id: tenantId,
        email,
        first_name,
        last_name: last_name || '',
        phone_number: phone_number || '',
        role,
        password_hash: passwordHash,
        is_active: true,
      })
      .select('id, email, first_name, last_name, phone_number, role, is_active')
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { ...newUser, tempPassword },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
