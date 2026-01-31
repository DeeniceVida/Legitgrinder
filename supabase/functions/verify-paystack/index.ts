
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Types for Deno environment
declare const Deno: any;

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { reference } = await req.json()

        if (!PAYSTACK_SECRET_KEY) {
            console.error('PAYSTACK_SECRET_KEY is not set')
            return new Response(JSON.stringify({
                success: false,
                message: 'Server configuration error: Missing Secret Key. Please set PAYSTACK_SECRET_KEY in Supabase Vault.'
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
        })

        const data = await response.json()

        if (data.status && data.data.status === 'success') {
            return new Response(JSON.stringify({ success: true, data: data.data }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        } else {
            console.warn('Paystack verification failed:', data)
            return new Response(JSON.stringify({
                success: false,
                message: data.message || 'Payment verification failed'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }
    } catch (error) {
        console.error('Edge Function Error:', error)
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
