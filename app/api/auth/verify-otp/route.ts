import { createApiClient } from '@/lib/supabase/api-client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { mobile_number, otp_code } = await request.json()
    const supabase = createApiClient()
    
    console.log('Verify OTP request for:', mobile_number, 'OTP:', otp_code)
    
    if (!mobile_number || !otp_code) {
      return NextResponse.json(
        { error: 'Mobile number and OTP code are required' },
        { status: 400 }
      )
    }
    
    // Find and verify OTP
    const { data: otpData, error: otpError } = await supabase
      .from('user_otps')
      .select('id, attempt_count')
      .eq('mobile_number', mobile_number)
      .eq('otp_code', otp_code)
      .eq('purpose', 'signup')
      .gt('expires_at', new Date().toISOString())
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
      .maybeSingle()
    
    console.log('OTP verification result:', { otpData, otpError })
    
    if (otpError) {
      console.error('Error fetching OTP:', otpError)
      return NextResponse.json(
        { error: `Database error: ${otpError.message}` },
        { status: 500 }
      )
    }
    
    if (!otpData) {
      // Update attempt count for failed attempt
      await supabase
        .from('user_otps')
        .update({ attempt_count: supabase.rpc('increment', { x: 1 }) })
        .eq('mobile_number', mobile_number)
        .eq('otp_code', otp_code)
        .eq('is_verified', false)
      
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }
    
    // Check if too many attempts
    if (otpData.attempt_count >= 5) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new OTP.' },
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
      return NextResponse.json(
        { error: `Failed to verify OTP: ${updateError.message}` },
        { status: 500 }
      )
    }
    
    // Check if user already exists
    const { data: existingUser, error: userError } = await supabase
      .from('showroom_users')
      .select('id')
      .eq('mobile_number', mobile_number)
      .maybeSingle()
    
    if (userError) {
      console.error('Error checking user:', userError)
    }
    
    console.log('User exists check:', !!existingUser)
    
    return NextResponse.json({ 
      success: true, 
      user_exists: !!existingUser 
    })
    
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: `Failed to verify OTP: ${error.message}` },
      { status: 500 }
    )
  }
}