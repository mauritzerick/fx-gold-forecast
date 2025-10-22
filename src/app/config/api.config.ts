/**
 * API Configuration
 * 
 * To get a FREE API key for real gold price data:
 * 1. Go to https://metals-api.com/
 * 2. Sign up for a free account
 * 3. Get your API key from the dashboard
 * 4. Replace 'YOUR_FREE_API_KEY' below with your actual key
 * 
 * Free tier includes:
 * - 100 requests per month
 * - Real-time gold prices
 * - Historical data (limited)
 * 
 * Alternative free APIs:
 * - https://gold-api.com/ (free tier available)
 * - https://api-ninjas.com/api/goldprice (requires signup)
 * - https://freegoldprice.org/ (no API key required, limited)
 */

export const API_CONFIG = {
  // Metals-API configuration
  METALS_API: {
    BASE_URL: 'https://api.metals.live/v1',
    API_KEY: 'YOUR_FREE_API_KEY', // Replace with your free API key
    FREE_TIER_LIMITS: {
      REQUESTS_PER_MONTH: 100,
      HISTORICAL_DATA_DAYS: 30
    }
  },
  
  // Fallback configuration
  FALLBACK: {
    USE_MOCK_DATA: true,
    MOCK_DATA_NOTICE: 'Using mock data - get free API key for real prices'
  }
};

/**
 * Instructions for getting a free API key:
 * 
 * 1. Visit: https://metals-api.com/
 * 2. Click "Get Free API Key"
 * 3. Sign up with email
 * 4. Verify your email
 * 5. Copy your API key from dashboard
 * 6. Replace 'YOUR_FREE_API_KEY' in this file
 * 7. Restart your Angular app
 * 
 * Your app will then use REAL gold price data!
 */
