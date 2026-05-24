import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, otp_code } = await request.json()
    
    if (!email || !otp_code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Find valid OTP
    const { data: otpData, error: otpError } = await supabase
      .from('user_otps')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp_code)
      .eq('purpose', 'signup')
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (otpError || !otpData) {
      // Check if OTP exists but expired
      const { data: expiredOtp } = await supabase
        .from('user_otps')
        .select('*')
        .eq('email', email)
        .eq('otp_code', otp_code)
        .eq('purpose', 'signup')
        .eq('is_verified', false)
        .lte('expires_at', new Date().toISOString())
        .single()
      
      if (expiredOtp) {
        return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 })
      }
      
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })
    }
    
    // Update attempt count
    await supabase
      .from('user_otps')
      .update({ 
        is_verified: true,
        attempt_count: (otpData.attempt_count || 0) + 1
      })
      .eq('id', otpData.id)
    
    // Check if user already exists
    const { data: user, error: userError } = await supabase
      .from('showroom_users')
      .select('email')
      .eq('email', email)
      .single()
    
    return NextResponse.json({ 
      user_exists: !!user,
      verified: true 
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}