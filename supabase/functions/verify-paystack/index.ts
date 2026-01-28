
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')

serve(async (req) => {
    const { reference } = await req.json()

    try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
        })

        const data = await response.json()

        if (data.status && data.data.status === 'success') {
            return new Response(JSON.stringify({ success: true, data: data.data }), {
                headers: { 'Content-Type': 'application/json' },
            })
        } else {
            return new Response(JSON.stringify({ success: false, message: 'Payment verification failed' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            })
        }
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
})
