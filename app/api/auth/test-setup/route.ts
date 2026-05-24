import { createApiClient } from '@/lib/supabase/api-client'
import { NextResponse } from 'next/server'

export async function GET() {
  const results = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    emailjs_public: !!process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
    emailjs_service: !!process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
    emailjs_template: !!process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
    database: null as any,
    test_insert: null as any
  }
  
  try {
    const supabase = createApiClient()
    
    // Test database connection
    const { data, error } = await supabase
      .from('user_otps')
      .select('count')
      .limit(1)
    
    if (error) {
      results.database = { success: false, error: error.message }
    } else {
      results.database = { success: true }
    }
    
    // Test insert
    const testEmail = `test_${Date.now()}@example.com`
    const { error: insertError } = await supabase
      .from('user_otps')
      .insert({
        email: testEmail,
        otp_code: '123456',
        purpose: 'test',
        expires_at: new Date(Date.now() + 5 * 60000).toISOString(),
        is_verified: false
      })
    
    if (insertError) {
      results.test_insert = { success: false, error: insertError.message }
    } else {
      results.test_insert = { success: true }
      // Clean up
      await supabase.from('user_otps').delete().eq('email', testEmail)
    }
    
  } catch (error) {
    results.database = { success: false, error: error.message }
  }
  
  return NextResponse.json(results)
}