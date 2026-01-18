
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { url, itemId } = await req.json()
        if (!url) {
            throw new Error('URL is required')
        }

        // Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Find matching platform config triggered by domain
        // We fetch all active platforms and check regex/domain match
        // Optimization: In real world, we might cache this or query by domain if structured well.
        const { data: platforms, error: platformError } = await supabaseClient
            .from('affiliate_platforms')
            .select('*')
            .eq('is_active', true)

        if (platformError) throw platformError

        let affiliateUrl = url
        let matchedPlatform = null

        if (platforms) {
            for (const platform of platforms) {
                // Check if current URL matches any of the platform domains
                const domainMatch = platform.domains.some((d: string) => url.includes(d))

                if (domainMatch) {
                    matchedPlatform = platform
                    console.log(`Matched Platform: ${platform.name}`)

                    // 2. Apply Transformation
                    if (platform.type === 'param_injection') {
                        // Simple Logic: Add query params
                        // config example: { "tag": "my-tag-20" }
                        const urlObj = new URL(url)
                        const params = platform.config.params || {}
                        Object.keys(params).forEach(key => {
                            urlObj.searchParams.set(key, params[key])
                        })
                        affiliateUrl = urlObj.toString()

                    } else if (platform.type === 'api_generation') {
                        // Complex Logic: Call External API (e.g., Coupang Partners)
                        // For this MVP, we will mock this or implement a specific handler if requested.
                        // Usually involves HMAC signature and Fetch
                        if (platform.name === 'Coupang') {
                            // Placeholder for Coupang Logic
                            // const coupangLink = await generateCoupangLink(url, platform.config)
                            // affiliateUrl = coupangLink
                        }
                    }
                    break // Stop after first match
                }
            }
        }

        // 3. Log the click (Asynchronously/Fire & Forget ideally, but await here for safety)
        if (itemId && matchedPlatform) {
            const { user } = await supabaseClient.auth.getUser(req.headers.get('Authorization')?.split(' ')[1] ?? '')

            await supabaseClient.from('click_logs').insert({
                user_id: user?.data.user?.id || null, // Can be null if guest? But we usually require auth.
                item_id: itemId,
                platform_id: matchedPlatform.id,
                original_url: url,
                affiliate_url: affiliateUrl
            })
        }

        return new Response(
            JSON.stringify({ affiliateUrl }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
