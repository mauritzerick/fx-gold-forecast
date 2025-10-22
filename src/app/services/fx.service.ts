import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

export interface TimeseriesPoint {
  date: string;
  rate: number;
}

@Injectable({
  providedIn: 'root'
})
export class FxService {
  private http = inject(HttpClient);
  private cache = new Map<string, TimeseriesPoint[]>();

  getTimeseries(base: string, quote: string, from: string, to: string): Observable<TimeseriesPoint[]> {
    const cacheKey = `${base}|${quote}|${from}|${to}`;
    
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    // Try Frankfurter first
    return this.fetchFrankfurter(base, quote, from, to).pipe(
      catchError(() => {
        // Fallback to exchangerate.host
        return this.fetchExchangerateHost(base, quote, from, to);
      }),
      map(data => {
        this.cache.set(cacheKey, data);
        return data;
      })
    );
  }

  private fetchFrankfurter(base: string, quote: string, from: string, to: string): Observable<TimeseriesPoint[]> {
    const url = `https://api.frankfurter.app/${from}..${to}?from=${base}&to=${quote}`;
    
    return this.http.get<any>(url).pipe(
      map(response => this.normalizeFrankfurter(response, base, quote))
    );
  }

  private fetchExchangerateHost(base: string, quote: string, from: string, to: string): Observable<TimeseriesPoint[]> {
    const url = `https://api.exchangerate.host/timeseries?start_date=${from}&end_date=${to}&base=${base}&symbols=${quote}`;
    
    return this.http.get<any>(url).pipe(
      map(response => this.normalizeHost(response, quote))
    );
  }

  private normalizeFrankfurter(json: any, base: string, quote: string): TimeseriesPoint[] {
    const points: TimeseriesPoint[] = [];
    
    if (json.rates) {
      Object.entries(json.rates).forEach(([date, rates]: [string, any]) => {
        if (rates[quote]) {
          points.push({
            date,
            rate: rates[quote]
          });
        }
      });
    }
    
    return points.sort((a, b) => a.date.localeCompare(b.date));
  }

  private normalizeHost(json: any, quote: string): TimeseriesPoint[] {
    const points: TimeseriesPoint[] = [];
    
    if (json.rates) {
      Object.entries(json.rates).forEach(([date, rates]: [string, any]) => {
        if (rates[quote]) {
          points.push({
            date,
            rate: rates[quote]
          });
        }
      });
    }
    
    return points.sort((a, b) => a.date.localeCompare(b.date));
  }
}
