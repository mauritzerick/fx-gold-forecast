import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { combineLatest, switchMap, catchError, of, EMPTY, startWith, debounceTime, distinctUntilChanged } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import dayjs from 'dayjs';

import { FxService, TimeseriesPoint } from '../services/fx.service';
import { holtLinear, sma, ema, buildChartData, ChartPoint } from '../utils/time-series';
import { toCsv, downloadCsv } from '../utils/csv';
import { PairSelectComponent } from '../components/pair-select/pair-select.component';
import { ControlsComponent } from '../components/controls/controls.component';
import { FxChartComponent } from '../components/fx-chart/fx-chart.component';

@Component({
  selector: 'app-fx-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PairSelectComponent,
    ControlsComponent,
    FxChartComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="flex justify-center gap-4 mb-4">
            <a 
              routerLink="/" 
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              FX Forecasting
            </a>
            <a 
              routerLink="/gold" 
              class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              Gold (KG)
            </a>
            <a 
              routerLink="/gold-oz" 
              class="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
            >
              Gold (OZ)
            </a>
          </div>
          <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            FX Forecasting
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            Primary data: Frankfurter (ECB). Fallback: exchangerate.host.
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Holt smoothing + optional SMA/EMA overlays. Bands are illustrative only; not financial advice.
          </p>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">Loading currency data...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error()" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <div class="mt-2 text-sm text-red-700 dark:text-red-300">
                {{ error() }}
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div *ngIf="!isLoading() && !error()" class="space-y-8">
          <!-- Pair Selection -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Currency Pair</h2>
            <app-pair-select
              [base]="base()"
              [quote]="quote()"
              (baseChange)="onBaseChange($event)"
              (quoteChange)="onQuoteChange($event)"
              (swap)="onSwap()"
            />
          </div>

          <!-- Controls -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <app-controls
              [days]="days()"
              [alpha]="alpha()"
              [beta]="beta()"
              [horizon]="horizon()"
              [smaWindow]="smaWindow()"
              [emaWindow]="emaWindow()"
              [showSMA]="showSMA()"
              [showEMA]="showEMA()"
              [isDark]="isDark()"
              (daysChange)="onDaysChange($event)"
              (alphaChange)="onAlphaChange($event)"
              (betaChange)="onBetaChange($event)"
              (horizonChange)="onHorizonChange($event)"
              (smaWindowChange)="onSmaWindowChange($event)"
              (emaWindowChange)="onEmaWindowChange($event)"
              (showSMAChange)="onShowSMAChange($event)"
              (showEMAChange)="onShowEMAChange($event)"
              (refresh)="onRefresh()"
              (downloadCsv)="onDownloadCsv()"
              (toggleTheme)="onToggleTheme()"
            />
          </div>

          <!-- Chart -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Forecast Chart</h2>
            <app-fx-chart
              [data]="chartData()"
              [lastDate]="lastHistoricalDate()"
              [smaWindow]="smaWindow()"
              [emaWindow]="emaWindow()"
              [isDark]="isDark()"
            />
          </div>

          <!-- Stats -->
          <div *ngIf="timeseries().length > 0" class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Statistics</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {{ lastRate() }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Last Rate</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                  {{ forecastRate() }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Forecast ({{ horizon() }}d)</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {{ timeseries().length }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Data Points</div>
              </div>
            </div>
          </div>

          <!-- Legend Section -->
          <div class="mt-12 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">📊 Understanding the Parameters</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <!-- Forecasting Parameters -->
              <div class="space-y-3">
                <h4 class="font-medium text-gray-800 dark:text-gray-200">🔮 Forecasting</h4>
                <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li><strong>Alpha (α):</strong> Controls how much recent data influences the forecast (0.1 = smooth, 0.9 = reactive)</li>
                  <li><strong>Beta (β):</strong> Controls trend sensitivity (0.1 = stable trends, 0.9 = volatile trends)</li>
                  <li><strong>Horizon:</strong> Number of days to forecast into the future (7-30 days recommended)</li>
                  <li><strong>Confidence Bands:</strong> 95% probability range where the rate might fall</li>
                </ul>
              </div>

              <!-- Technical Indicators -->
              <div class="space-y-3">
                <h4 class="font-medium text-gray-800 dark:text-gray-200">📈 Technical Indicators</h4>
                <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li><strong>SMA (Simple Moving Average):</strong> Average rate over the last N days (smooths out noise)</li>
                  <li><strong>EMA (Exponential Moving Average):</strong> Gives more weight to recent data (more responsive)</li>
                  <li><strong>Window Size:</strong> Number of days to include in the moving average calculation</li>
                  <li><strong>Trend Analysis:</strong> Helps identify if rates are rising, falling, or sideways</li>
                </ul>
              </div>

              <!-- Data & Chart -->
              <div class="space-y-3">
                <h4 class="font-medium text-gray-800 dark:text-gray-200">📊 Chart Elements</h4>
                <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li><strong>Actual:</strong> Real historical exchange rates from the API</li>
                  <li><strong>Fitted:</strong> How well our model explains the historical data</li>
                  <li><strong>Forecast:</strong> Predicted future rates using Holt smoothing</li>
                  <li><strong>History Period:</strong> How many days of data to analyze (7-1500 days)</li>
                  <li><strong>Reference Line:</strong> Vertical line marking the last historical date</li>
                </ul>
              </div>
            </div>

            <!-- Additional Tips -->
            <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 class="font-medium text-blue-800 dark:text-blue-200 mb-2">Tips</h4>
              <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Start with default settings (α=0.5, β=0.3) and adjust based on currency volatility</li>
                <li>• Higher alpha values make forecasts more reactive to recent changes</li>
                <li>• Use SMA for long-term trends, EMA for short-term momentum</li>
                <li>• Confidence bands show uncertainty - wider bands = less predictable</li>
                <li>• Different currency pairs may need different parameter settings</li>
              </ul>
            </div>
          </div>

          <!-- Footer -->
          <div class="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            <p>Data provided by Frankfurter (ECB) and exchangerate.host</p>
            <p class="mt-1">Forecasting is for illustrative purposes only. Not financial advice.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class FxPageComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fxService = inject(FxService);

  // State signals
  base = signal('USD');
  quote = signal('EUR');
  days = signal(180);
  alpha = signal(0.5);
  beta = signal(0.3);
  horizon = signal(14);
  smaWindow = signal(10);
  emaWindow = signal(20);
  showSMA = signal(true);
  showEMA = signal(false);
  isDark = signal(false);

  // Data signals
  timeseries = signal<TimeseriesPoint[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Computed values
  lastHistoricalDate = computed(() => {
    const data = this.timeseries();
    return data.length > 0 ? data[data.length - 1].date : '';
  });

  lastRate = computed(() => {
    const data = this.timeseries();
    return data.length > 0 ? data[data.length - 1].rate.toFixed(4) : '0.0000';
  });

  forecastRate = computed(() => {
    const data = this.timeseries();
    if (data.length === 0) return '0.0000';
    
    const rates = data.map(d => d.rate);
    const { forecast } = holtLinear(rates, this.alpha(), this.beta(), this.horizon());
    return forecast.length > 0 ? forecast[0].toFixed(4) : '0.0000';
  });

  chartData = computed(() => {
    const data = this.timeseries();
    if (data.length === 0) return [];

    const rates = data.map(d => d.rate);
    const { fitted, forecast, sigma } = holtLinear(rates, this.alpha(), this.beta(), this.horizon());
    
    const smaArr = this.showSMA() ? sma(rates, this.smaWindow()) : new Array(rates.length).fill(null);
    const emaArr = this.showEMA() ? ema(rates, this.emaWindow()) : new Array(rates.length).fill(null);

    return buildChartData(data, fitted, forecast, sigma, smaArr, emaArr);
  });

  private subscription: any;

  constructor() {
    try {
      // Set up reactive data fetching with RxJS in constructor (injection context)
      this.setupReactiveDataFetching();
      
      // Temporarily disable URL updates to test if they're causing page refreshes
      // this.setupReactiveUrlUpdates();
    } catch (error) {
      console.error('Error setting up reactive streams:', error);
    }
  }

  ngOnInit() {
    try {
      console.log('FX Page Component initializing...');
      
      // Track navigation events
      window.addEventListener('beforeunload', () => {
        console.log('🚨 Page is about to unload/refresh!');
      });
      
      // Initialize dark mode from localStorage
      const savedTheme = localStorage.getItem('fx-theme');
      if (savedTheme === 'dark') {
        this.isDark.set(true);
        document.documentElement.classList.add('dark');
      }

      // Load initial state from query params
      this.loadFromQueryParams();

      // Listen for query param changes
      this.route.queryParamMap.subscribe(() => {
        console.log('🔄 Query params changed - this might cause a refresh');
        this.loadFromQueryParams();
      });
      
      console.log('FX Page Component initialized successfully');
    } catch (error) {
      console.error('Error initializing FX Page Component:', error);
      this.error.set('Failed to initialize application. Please refresh the page.');
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private loadFromQueryParams() {
    const params = this.route.snapshot.queryParams;
    
    if (params['base']) this.base.set(params['base']);
    if (params['quote']) this.quote.set(params['quote']);
    if (params['days']) this.days.set(+params['days']);
    if (params['alpha']) this.alpha.set(+params['alpha']);
    if (params['beta']) this.beta.set(+params['beta']);
    if (params['horizon']) this.horizon.set(+params['horizon']);
    if (params['smaWin']) this.smaWindow.set(+params['smaWin']);
    if (params['emaWin']) this.emaWindow.set(+params['emaWin']);
    if (params['sma']) this.showSMA.set(params['sma'] === 'true');
    if (params['ema']) this.showEMA.set(params['ema'] === 'true');
  }


  private setupReactiveDataFetching() {
    try {
      console.log('Setting up reactive data fetching with RxJS...');
      
      // Convert signals to observables with debouncing to prevent excessive API calls
      const base$ = toObservable(this.base).pipe(
        debounceTime(300),
        distinctUntilChanged(),
        startWith(this.base())
      );
      
      const quote$ = toObservable(this.quote).pipe(
        debounceTime(300),
        distinctUntilChanged(),
        startWith(this.quote())
      );
      
      const days$ = toObservable(this.days).pipe(
        debounceTime(300),
        distinctUntilChanged(),
        startWith(this.days())
      );

      // Combine all parameters and react to changes
      this.subscription = combineLatest({
        base: base$,
        quote: quote$,
        days: days$
      }).pipe(
        switchMap(({ base, quote, days }) => {
          console.log('🔄 Parameters changed, fetching data for:', base, quote, days);
          this.isLoading.set(true);
          this.error.set(null);

          const to = dayjs().format('YYYY-MM-DD');
          const from = dayjs().subtract(days, 'day').format('YYYY-MM-DD');

          console.log('📡 API call:', { base, quote, from, to });

          return this.fxService.getTimeseries(base, quote, from, to).pipe(
            catchError(err => {
              console.error('❌ Error fetching data:', err);
              this.error.set('Failed to fetch currency data. Please try again.');
              this.isLoading.set(false);
              return of([]);
            })
          );
        })
      ).subscribe({
        next: (data) => {
          console.log('✅ Data received:', data.length, 'points');
          this.timeseries.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('❌ Subscription error:', err);
          this.error.set('Failed to load data. Please refresh the page.');
          this.isLoading.set(false);
        }
      });
    } catch (error) {
      console.error('Error setting up reactive data fetching:', error);
      this.error.set('Failed to initialize data fetching. Please refresh the page.');
    }
  }

  private setupReactiveUrlUpdates() {
    try {
      console.log('Setting up reactive URL updates...');
      
      // Combine all parameters that should update the URL
      const urlParams$ = combineLatest({
        base: toObservable(this.base),
        quote: toObservable(this.quote),
        days: toObservable(this.days),
        alpha: toObservable(this.alpha),
        beta: toObservable(this.beta),
        horizon: toObservable(this.horizon),
        smaWindow: toObservable(this.smaWindow),
        emaWindow: toObservable(this.emaWindow),
        showSMA: toObservable(this.showSMA),
        showEMA: toObservable(this.showEMA)
      }).pipe(
        debounceTime(1000), // Increased debounce time to prevent excessive navigation
        distinctUntilChanged((prev, curr) => {
          const isEqual = JSON.stringify(prev) === JSON.stringify(curr);
          if (!isEqual) {
            console.log('URL params changed:', { prev, curr });
          }
          return isEqual;
        })
      );

      // Subscribe to parameter changes and update URL
      urlParams$.subscribe({
        next: (params) => {
          console.log('Updating URL with params:', params);
          this.updateUrlWithParams(params);
        },
        error: (err) => {
          console.error('Error in URL updates stream:', err);
        }
      });
    } catch (error) {
      console.error('Error setting up reactive URL updates:', error);
    }
  }

  private updateUrlWithParams(params: any) {
    try {
      const queryParams = {
        base: params.base,
        quote: params.quote,
        days: params.days,
        alpha: params.alpha,
        beta: params.beta,
        horizon: params.horizon,
        smaWin: params.smaWindow,
        emaWin: params.emaWindow,
        sma: params.showSMA,
        ema: params.showEMA
      };

      console.log('Navigating to URL with params:', queryParams);

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams,
        replaceUrl: true, // Replace current URL instead of adding to history
        skipLocationChange: false, // Allow URL to change but don't trigger navigation
        queryParamsHandling: 'merge' // Merge with existing query params
      });
    } catch (error) {
      console.error('Error updating URL:', error);
    }
  }

  private loadData() {
    // This method is now just for manual refresh - the reactive stream handles automatic updates
    console.log('Manual data refresh triggered');
    // The reactive stream will automatically pick up any signal changes
  }


  // Event handlers
  onBaseChange(newBase: string) {
    this.base.set(newBase);
    // URL will be updated automatically by reactive stream
  }

  onQuoteChange(newQuote: string) {
    this.quote.set(newQuote);
    // URL will be updated automatically by reactive stream
  }

  onSwap() {
    const currentBase = this.base();
    const currentQuote = this.quote();
    this.base.set(currentQuote);
    this.quote.set(currentBase);
    // URL will be updated automatically by reactive stream
  }

  onDaysChange(days: number) {
    console.log('🎯 Days changed to:', days);
    console.log('🎯 About to set days signal...');
    this.days.set(days);
    console.log('🎯 Days signal set successfully');
    // URL will be updated automatically by reactive stream
  }

  onAlphaChange(alpha: number) {
    this.alpha.set(alpha);
    // URL will be updated automatically by reactive stream
  }

  onBetaChange(beta: number) {
    this.beta.set(beta);
    // URL will be updated automatically by reactive stream
  }

  onHorizonChange(horizon: number) {
    this.horizon.set(horizon);
    // URL will be updated automatically by reactive stream
  }

  onSmaWindowChange(window: number) {
    this.smaWindow.set(window);
    // URL will be updated automatically by reactive stream
  }

  onEmaWindowChange(window: number) {
    this.emaWindow.set(window);
    // URL will be updated automatically by reactive stream
  }

  onShowSMAChange(show: boolean) {
    this.showSMA.set(show);
    // URL will be updated automatically by reactive stream
  }

  onShowEMAChange(show: boolean) {
    this.showEMA.set(show);
    // URL will be updated automatically by reactive stream
  }

  onRefresh() {
    this.loadData();
  }

  onDownloadCsv() {
    const data = this.timeseries();
    if (data.length === 0) return;

    const rates = data.map(d => d.rate);
    const { fitted, forecast, sigma } = holtLinear(rates, this.alpha(), this.beta(), this.horizon());
    const smaArr = this.showSMA() ? sma(rates, this.smaWindow()) : new Array(rates.length).fill(null);
    const emaArr = this.showEMA() ? ema(rates, this.emaWindow()) : new Array(rates.length).fill(null);

    const chartData = buildChartData(data, fitted, forecast, sigma, smaArr, emaArr);
    
    const csvData = chartData.map(point => ({
      date: point.x,
      actual: point.actual,
      fitted: point.fitted,
      sma: point.sma,
      ema: point.ema,
      forecast: point.forecast,
      bandLo: point.bandLo,
      bandHi: point.bandHi
    }));

    const csv = toCsv(csvData, ['date', 'actual', 'fitted', 'sma', 'ema', 'forecast', 'bandLo', 'bandHi']);
    const filename = `fx-forecast-${this.base()}-${this.quote()}-${dayjs().format('YYYY-MM-DD')}.csv`;
    
    downloadCsv(csv, filename);
  }

  onCopyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      // Could show a toast notification here
      console.log('Link copied to clipboard');
    });
  }

  onToggleTheme() {
    this.isDark.set(!this.isDark());
    
    if (this.isDark()) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fx-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fx-theme', 'light');
    }
  }
}
