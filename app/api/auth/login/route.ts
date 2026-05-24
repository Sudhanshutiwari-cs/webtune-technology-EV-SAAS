import { createApiClient } from '@/lib/supabase/api-client'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { email, password, login_type } = await request.json()
    const supabase = createApiClient()
    
    if (login_type === 'password') {
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400 }
        )
      }
      
      // Find user by email
      const { data: user, error: userError } = await supabase
        .from('showroom_users')
        .select('id, full_name, email, password_hash, role, is_active, mobile_number')
        .eq('email', email)
        .eq('is_active', true)
        .single()
      
      if (userError || !user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
      
      // Get user's showroom
      const { data: showroom } = await supabase
        .from('showrooms')
        .select('id, showroom_name')
        .eq('owner_id', user.id)
        .single()
      
      // Generate tokens
      const authToken = crypto.randomBytes(64).toString('hex')
      const sessionToken = crypto.randomBytes(32).toString('hex')
      
      // Update last login
      await supabase
        .from('showroom_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id)
      
      // Create response with cookie
      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email,
          role: user.role,
          mobile_number: user.mobile_number
        },
        showroom: showroom || null,
        session_token: sessionToken
      })
      
      // Set HTTP-only cookie
      response.cookies.set('auth_token', authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      })
      
      // Set client-readable cookie
      response.cookies.set('user_logged_in', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      })
      
      return response
    }
    
    return NextResponse.json(
      { error: 'Invalid login type' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    )
  }
}