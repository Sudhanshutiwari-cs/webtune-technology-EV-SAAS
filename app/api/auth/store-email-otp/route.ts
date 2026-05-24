import { createApiClient } from '@/lib/supabase/api-client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('📨 Store OTP request:', body)
    
    const { email, otp_code, purpose } = body
    
    // Validate inputs
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    
    if (!otp_code) {
      return NextResponse.json({ error: 'OTP code is required' }, { status: 400 })
    }
    
    if (!purpose) {
      return NextResponse.json({ error: 'Purpose is required' }, { status: 400 })
    }
    
    const supabase = createApiClient()
    
    // Set expiry to 5 minutes from now
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    
    // First, invalidate any previous unverified OTPs
    const { error: updateError } = await supabase
      .from('user_otps')
      .update({ is_verified: true })
      .eq('email', email)
      .eq('is_verified', false)
      .eq('purpose', purpose)
    
    if (updateError) {
      console.log('⚠️ Note: Could not invalidate old OTPs:', updateError.message)
      // Continue anyway
    }
    
    // Insert new OTP
    const { data, error: insertError } = await supabase
      .from('user_otps')
      .insert({
        email: email,
        otp_code: otp_code,
        purpose: purpose,
        expires_at: expires_at,
        is_verified: false,
        created_at: new Date().toISOString()
      })
      .select()
    
    if (insertError) {
      console.error('❌ Database insert error:', insertError)
      return NextResponse.json(
        { 
          error: `Database error: ${insertError.message}`,
          details: insertError
        },
        { status: 500 }
      )
    }
    
    console.log('✅ OTP stored successfully for:', email)
    
    return NextResponse.json({ 
      success: true, 
      message: 'OTP stored successfully',
      otp_id: data?.[0]?.id 
    })
    
  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    )
  }
}