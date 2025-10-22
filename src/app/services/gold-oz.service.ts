import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface GoldOzPricePoint {
  date: string;
  price: number;
}

// Metals-API response interfaces
interface MetalsApiResponse {
  success: boolean;
  timestamp: number;
  base: string;
  date: string;
  rates: {
    XAU: number; // Gold price per ounce
  };
}

interface MetalsApiHistoricalResponse {
  success: boolean;
  timeseries: boolean;
  start_date: string;
  end_date: string;
  base: string;
  rates: {
    [date: string]: {
      XAU: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class GoldOzService {
  private http = inject(HttpClient);

  // Metals-API configuration
  private readonly METALS_API_BASE = API_CONFIG.METALS_API.BASE_URL;
  private readonly METALS_API_KEY = API_CONFIG.METALS_API.API_KEY;
  
  // Cache to store prices and avoid excessive API calls
  private priceCache: Map<string, GoldOzPricePoint[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  getGoldOzPrices(from: string, to: string): Observable<GoldOzPricePoint[]> {
    const cacheKey = `${from}-${to}`;
    
    // Check if we have cached data that's still valid
    if (this.isCacheValid(cacheKey)) {
      console.log('📦 Using cached gold OZ data');
      return of(this.priceCache.get(cacheKey)!);
    }

    // Try real API first, fallback to mock data
    return this.getRealGoldOzPrices(from, to).pipe(
      catchError(error => {
        console.warn('⚠️ Real API failed, using mock data:', error.message);
        return this.getDeterministicMockOzPrices(from, to);
      })
    );
  }

  private getRealGoldOzPrices(from: string, to: string): Observable<GoldOzPricePoint[]> {
    const cacheKey = `${from}-${to}`;
    
    // For historical data, use timeseries endpoint
    const url = `${this.METALS_API_BASE}/timeseries`;
    const params = {
      access_key: this.METALS_API_KEY,
      start_date: from,
      end_date: to,
      base: 'USD',
      symbols: 'XAU'
    };

    console.log('🌐 Fetching real gold OZ data from Metals-API:', { from, to });

    return this.http.get<MetalsApiHistoricalResponse>(url, { params }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error('API returned success: false');
        }

        const prices: GoldOzPricePoint[] = [];
        
        // Convert API response to our format
        Object.entries(response.rates).forEach(([date, rates]) => {
          if (rates.XAU) {
            // Convert from USD per ounce to AUD per ounce
            const pricePerOz = rates.XAU;
            const priceInAUD = pricePerOz * 1.5; // Approximate USD to AUD conversion
            
            prices.push({
              date: date,
              price: Math.round(priceInAUD * 100) / 100
            });
          }
        });

        // Sort by date
        prices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        console.log('✅ Real gold OZ data received:', prices.length, 'points');
        console.log('📊 Price range:', Math.min(...prices.map(p => p.price)), 'to', Math.max(...prices.map(p => p.price)));

        // Cache the result
        this.priceCache.set(cacheKey, prices);
        this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

        return prices;
      }),
      catchError(error => {
        console.error('❌ Metals-API error:', error);
        throw error;
      })
    );
  }

  private generateHistoricalOzData(from: string, to: string, currentPrice: number): GoldOzPricePoint[] {
    const startDate = new Date(from);
    const endDate = new Date(to);
    const prices: GoldOzPricePoint[] = [];
    
    // Generate prices working backwards from current price
    let price = currentPrice;
    const currentDate = new Date(endDate);
    
    while (currentDate >= startDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Only add data for weekdays (Monday to Friday)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Add more realistic volatility and trend for better forecasting
        const volatility = 0.015; // 1.5% daily volatility (increased)
        const trend = 0.0001; // Slight upward trend (working backwards, so this creates upward historical trend)
        
        // Use deterministic "random" based on date to ensure consistency
        const dateSeed = currentDate.getTime();
        const pseudoRandom = Math.sin(dateSeed * 0.0001) * 0.5 + 0.5;
        const randomChange = (pseudoRandom - 0.5) * volatility;
        
        price = price * (1 + trend + randomChange);
        
        prices.unshift({
          date: currentDate.toISOString().split('T')[0],
          price: Math.round(price * 100) / 100
        });
      }
      
      // Move to previous day
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    // Debug: Log price range for analysis
    if (prices.length > 0) {
      const minPrice = Math.min(...prices.map(p => p.price));
      const maxPrice = Math.max(...prices.map(p => p.price));
      const priceRange = maxPrice - minPrice;
      const firstPrice = prices[0].price;
      const lastPrice = prices[prices.length - 1].price;
      const overallTrend = lastPrice - firstPrice;
      
      console.log('📊 Gold OZ Price Data Analysis:');
      console.log('  - Data points:', prices.length);
      console.log('  - Price range:', minPrice.toFixed(2), 'to', maxPrice.toFixed(2));
      console.log('  - Total range:', priceRange.toFixed(2));
      console.log('  - First price:', firstPrice.toFixed(2));
      console.log('  - Last price:', lastPrice.toFixed(2));
      console.log('  - Overall trend:', overallTrend.toFixed(2), overallTrend > 0 ? '(UP)' : overallTrend < 0 ? '(DOWN)' : '(FLAT)');
    }
    
    return prices;
  }

  private getDeterministicMockOzPrices(from: string, to: string): Observable<GoldOzPricePoint[]> {
    const cacheKey = `${from}-${to}`;
    
    // Generate deterministic mock data (same prices every time)
    const prices = this.generateHistoricalOzData(from, to, 6348.60); // Base price $6,348.60/oz
    
    // Cache the result
    this.priceCache.set(cacheKey, prices);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
    
    return of(prices);
  }

  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry ? Date.now() < expiry : false;
  }
}
