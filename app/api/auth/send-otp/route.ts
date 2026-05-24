import { createApiClient } from '@/lib/supabase/api-client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { mobile_number, purpose = 'signup' } = await request.json()
    
    console.log('Send OTP request for:', mobile_number, 'purpose:', purpose)
    
    if (!mobile_number) {
      return NextResponse.json(
        { error: 'Mobile number is required' },
        { status: 400 }
      )
    }
    
    const supabase = createApiClient()
    
    // For login purpose, check if user exists first
    if (purpose === 'login') {
      const { data: existingUser, error: userError } = await supabase
        .from('showroom_users')
        .select('id')
        .eq('mobile_number', mobile_number)
        .eq('is_active', true)
        .maybeSingle()
      
      if (userError) {
        console.error('Error checking user:', userError)
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        )
      }
      
      if (!existingUser) {
        return NextResponse.json(
          { 
            error: 'No account found with this mobile number', 
            requiresRegistration: true 
          },
          { status: 404 }
        )
      }
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    
    // Delete any expired OTPs
    await supabase
      .from('user_otps')
      .delete()
      .eq('mobile_number', mobile_number)
      .eq('purpose', purpose)
      .lt('expires_at', new Date().toISOString())
    
    // Insert new OTP
    const { error: insertError } = await supabase
      .from('user_otps')
      .insert({
        mobile_number: mobile_number,
        otp_code: otp,
        purpose: purpose,
        expires_at: expiresAt.toISOString(),
        attempt_count: 0,
        is_verified: false,
        created_at: new Date().toISOString()
      })
    
    if (insertError) {
      console.error('Database error:', insertError)
      return NextResponse.json(
        { error: `Database operation failed: ${insertError.message}` },
        { status: 500 }
      )
    }
    
    // In development, return OTP for testing
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ 
        success: true, 
        otp,
        expires_at: expiresAt.toISOString(),
        message: 'OTP sent successfully (development mode)'
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'OTP sent successfully' 
    })
    
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: `Failed to send OTP: ${error.message}` },
      { status: 500 }
    )
  }
}