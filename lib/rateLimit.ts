import { NextRequest, NextResponse } from 'next/server'

interface RateLimitStore {
  count: number
  resetTime: number
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitStore>()

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

export function rateLimit(config: RateLimitConfig) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    // Get identifier (IP address or user ID)
    const identifier = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    const key = `${identifier}:${req.nextUrl.pathname}`
    
    const now = Date.now()
    const store = rateLimitStore.get(key)
    
    // Clean up old entries
    if (store && now > store.resetTime) {
      rateLimitStore.delete(key)
    }
    
    const current = rateLimitStore.get(key)
    
    if (!current) {
      // First request in window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      })
      return null // Allow request
    }
    
    if (current.count >= config.maxRequests) {
      // Rate limit exceeded
      const resetIn = Math.ceil((current.resetTime - now) / 1000)
      
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
          retryAfter: resetIn,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(resetIn),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(current.resetTime / 1000)),
          },
        }
      )
    }
    
    // Increment counter
    current.count++
    rateLimitStore.set(key, current)
    
    return null // Allow request
  }
}

// Cleanup old entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, store] of rateLimitStore.entries()) {
      if (now > store.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }, 60000) // Clean every minute
}

// Preset configurations
export const rateLimitPresets = {
  strict: { windowMs: 60000, maxRequests: 5 }, // 5 per minute
  moderate: { windowMs: 60000, maxRequests: 20 }, // 20 per minute
  lenient: { windowMs: 60000, maxRequests: 100 }, // 100 per minute
  auth: { windowMs: 900000, maxRequests: 5 }, // 5 per 15 minutes
}
