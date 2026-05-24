import { createApiClient } from '@/lib/supabase/api-client'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { email, otp_code } = await request.json()
    
    if (!email || !otp_code) {
      return NextResponse.json(
        { error: 'Email and OTP code are required' },
        { status: 400 }
      )
    }
    
    const supabase = createApiClient()
    
    // Find valid OTP for login
    const { data: otpData, error: otpError } = await supabase
      .from('user_otps')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp_code)
      .eq('purpose', 'login')
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (otpError || !otpData) {
      const { data: expiredOtp } = await supabase
        .from('user_otps')
        .select('*')
        .eq('email', email)
        .eq('otp_code', otp_code)
        .eq('purpose', 'login')
        .eq('is_verified', false)
        .lte('expires_at', new Date().toISOString())
        .single()
      
      if (expiredOtp) {
        return NextResponse.json(
          { error: 'OTP has expired. Please request a new one.' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 400 }
      )
    }
    
    // Mark OTP as verified
    await supabase
      .from('user_otps')
      .update({ 
        is_verified: true,
        attempt_count: (otpData.attempt_count || 0) + 1
      })
      .eq('id', otpData.id)
    
    // Get complete user details
    const { data: user, error: userError } = await supabase
      .from('showroom_users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Update last login
    const loginTimestamp = new Date().toISOString()
    await supabase
      .from('showroom_users')
      .update({ last_login_at: loginTimestamp })
      .eq('id', user.id)
    
    // Get showroom
    const { data: showroom, error: showroomError } = await supabase
      .from('showrooms')
      .select('*')
      .eq('owner_id', user.id)
      .single()
    
    if (showroomError || !showroom) {
      return NextResponse.json(
        { error: 'Showroom not found' },
        { status: 404 }
      )
    }
    
    // Get showroom addresses
    const { data: showroom_addresses } = await supabase
      .from('showroom_addresses')
      .select('*')
      .eq('showroom_id', showroom.id)
      .order('is_primary', { ascending: false })
    
    // Get showroom branding
    const { data: showroom_branding } = await supabase
      .from('showroom_branding')
      .select('*')
      .eq('showroom_id', showroom.id)
      .single()
    
    // Get billing configuration
    const { data: billing_configuration } = await supabase
      .from('billing_configurations')
      .select('*')
      .eq('showroom_id', showroom.id)
      .single()
    
    // Get active subscription
    const { data: subscription } = await supabase
      .from('showroom_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('showroom_id', showroom.id)
      .eq('payment_status', 'paid')
      .gte('subscription_expiry', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex')
    
    // Prepare complete data
    const completeData = {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        mobile_number: user.mobile_number,
        role: user.role,
        is_mobile_verified: user.is_mobile_verified,
        is_email_verified: user.is_email_verified,
        auth_provider: user.auth_provider,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: loginTimestamp
      },
      showroom: {
        id: showroom.id,
        showroom_name: showroom.showroom_name,
        business_type: showroom.business_type,
        gst_number: showroom.gst_number,
        pan_number: showroom.pan_number,
        business_registration_type: showroom.business_registration_type,
        created_at: showroom.created_at,
        updated_at: showroom.updated_at
      },
      showroom_addresses: showroom_addresses || [],
      showroom_branding: showroom_branding || null,
      billing_configuration: billing_configuration || null,
      subscription: subscription || null,
      session_token: sessionToken,
      login_timestamp: loginTimestamp
    }
    
    return NextResponse.json({
      success: true,
      complete_data: completeData
    })
    
  } catch (error) {
    console.error('Verify login OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}