import { createApiClient } from '@/lib/supabase/api-client'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { mobile_number, otp_code } = await request.json()
    const supabase = createApiClient()
    
    console.log('Verifying login OTP for:', mobile_number, 'OTP:', otp_code)
    
    if (!mobile_number || !otp_code) {
      return NextResponse.json(
        { error: 'Mobile number and OTP code are required' },
        { status: 400 }
      )
    }
    
    // First, check if user exists
    const { data: user, error: userError } = await supabase
      .from('showroom_users')
      .select('id, full_name, email, role, is_active, mobile_number')
      .eq('mobile_number', mobile_number)
      .eq('is_active', true)
      .single()
    
    console.log('User lookup result:', { user, userError })
    
    if (userError || !user) {
      console.error('User not found:', userError)
      return NextResponse.json(
        { error: 'User not found. Please register first.' },
        { status: 404 }
      )
    }
    
    // Verify OTP
    const { data: otpData, error: otpError } = await supabase
      .from('user_otps')
      .select('id')
      .eq('mobile_number', mobile_number)
      .eq('otp_code', otp_code)
      .eq('purpose', 'login')
      .gt('expires_at', new Date().toISOString())
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
      .maybeSingle()
    
    console.log('OTP verification result:', { otpData, otpError })
    
    if (otpError || !otpData) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }
    
    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('user_otps')
      .update({ is_verified: true })
      .eq('id', otpData.id)
    
    if (updateError) {
      console.error('Error updating OTP:', updateError)
    }
    
    // Get user's showroom
    const { data: showroom, error: showroomError } = await supabase
      .from('showrooms')
      .select('id, showroom_name')
      .eq('owner_id', user.id)
      .single()
    
    console.log('Showroom lookup result:', { showroom, showroomError })
    
    // Generate auth token
    const authToken = crypto.randomBytes(64).toString('hex')
    const sessionToken = crypto.randomBytes(32).toString('hex')
    
    // Update last login
    await supabase
      .from('showroom_users')
      .update({ 
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
    
    // Create response with user data
    const response = NextResponse.json({
      success: true,
      redirect: '/dashboard',
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
    
    // Set multiple cookies for redundancy
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    }
    
    // Set auth token cookie
    response.cookies.set('auth_token', authToken, cookieOptions)
    
    // Set user info in cookies (non-httpOnly for client access)
    response.cookies.set('user_id', user.id, { ...cookieOptions, httpOnly: false })
    response.cookies.set('user_name', user.full_name, { ...cookieOptions, httpOnly: false })
    response.cookies.set('user_email', user.email, { ...cookieOptions, httpOnly: false })
    response.cookies.set('user_logged_in', 'true', { ...cookieOptions, httpOnly: false })
    
    // Set showroom cookie
    if (showroom) {
      response.cookies.set('showroom_id', showroom.id, { ...cookieOptions, httpOnly: false })
      response.cookies.set('showroom_name', showroom.showroom_name, { ...cookieOptions, httpOnly: false })
    }
    
    return response
    
  } catch (error) {
    console.error('Verify login OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP: ' + error.message },
      { status: 500 }
    )
  }
}