import { Component, OnInit, OnDestroy, inject, signal, computed, runInInjectionContext, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { combineLatest, switchMap, catchError, of, startWith, debounceTime, distinctUntilChanged } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import dayjs from 'dayjs';

import { GoldService, GoldPricePoint } from '../services/gold.service';
import { GoldChartComponent, GoldChartPoint } from '../components/gold-chart/gold-chart.component';

@Component({
  selector: 'app-gold-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    GoldChartComponent
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
            Gold Price Chart
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            AUD per kilogram - Historical data only
          </p>
          
          <!-- Data Accuracy Notice -->
          <div class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg max-w-2xl mx-auto">
            <div class="flex items-center justify-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <span class="font-semibold">⚠️ WIP Data:</span>
              <span>Data is not accurate - using mock data for demonstration</span>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading()" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">Loading gold price data...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error()" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p class="text-red-800 dark:text-red-200 text-sm font-medium">{{ error() }}</p>
        </div>

        <div *ngIf="!isLoading() && !error()" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Controls Column -->
          <div class="lg:col-span-1 space-y-6">
            <!-- History Controls -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">History</h3>
              
              <div class="space-y-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Presets:</label>
                  <div class="flex gap-2">
                    <button
                      *ngFor="let preset of historyPresets"
                      type="button"
                      (click)="onDaysChange(preset.days)"
                      [class]="days() === preset.days ? 'bg-yellow-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
                      class="px-3 py-1 rounded-md text-sm font-medium transition-colors"
                    >
                      {{ preset.label }}
                    </button>
                  </div>
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Custom Days: {{ days() }}
                  </label>
                  <input
                    type="range"
                    min="7"
                    max="1500"
                    [value]="days()"
                    (input)="onDaysInput($event)"
                    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>7 days</span>
                    <span>1500 days</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Statistics -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Statistics</h3>
              
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400">Last Price:</span>
                  <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ lastPrice() }}</span>
                </div>
                
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400">Data Points:</span>
                  <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ goldPrices().length }}</span>
                </div>
                
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400">Date Range:</span>
                  <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ dateRange() }}</span>
                </div>
              </div>
            </div>

            <!-- Dark Mode Toggle -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</span>
                <button
                  type="button"
                  (click)="toggleDarkMode()"
                  [class]="isDark() ? 'bg-yellow-600' : 'bg-gray-200 dark:bg-gray-700'"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                >
                  <span
                    [class]="isDark() ? 'translate-x-6' : 'translate-x-1'"
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  ></span>
                </button>
              </div>
            </div>
          </div>

          <!-- Chart Column -->
          <div class="lg:col-span-2">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Gold Price Chart (AUD/kg)</h3>
              <div class="h-96">
                <app-gold-chart
                  [data]="chartData()"
                  [isDark]="isDark()"
                ></app-gold-chart>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class GoldPageComponent implements OnInit, OnDestroy {
  private goldService = inject(GoldService);
  private destroy$ = new Subject<void>();
  private injector = inject(Injector);

  // Signals
  days = signal(180);
  isLoading = signal(false);
  error = signal<string | null>(null);
  goldPrices = signal<GoldPricePoint[]>([]);
  isDark = signal(false);

  // History presets
  historyPresets = [
    { label: '90d', days: 90 },
    { label: '180d', days: 180 },
    { label: '1y', days: 365 }
  ];

  // Computed properties
  chartData = computed<GoldChartPoint[]>(() => {
    const data = this.goldPrices();
    if (data.length === 0) return [];

    // Convert to chart data format (only historical data, no forecasting)
    return data.map(point => ({
      x: point.date,
      actual: point.price,
      fitted: null,
      forecast: null,
      bandHi: null,
      bandLo: null
    }));
  });

  lastPrice = computed(() => {
    const data = this.goldPrices();
    if (data.length === 0) return 'N/A';
    const lastPrice = data[data.length - 1]?.price;
    return lastPrice ? `$${lastPrice.toLocaleString()}` : 'N/A';
  });

  dateRange = computed(() => {
    const data = this.goldPrices();
    if (data.length === 0) return 'N/A';
    const firstDate = data[0]?.date;
    const lastDate = data[data.length - 1]?.date;
    return firstDate && lastDate ? `${firstDate} to ${lastDate}` : 'N/A';
  });

  ngOnInit() {
    console.log('🚀 Gold Page Component ngOnInit');
    
    // Initialize dark mode
    if (this.isDark()) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    this.setupReactiveDataFetching();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupReactiveDataFetching() {
    runInInjectionContext(this.injector, () => {
      const days$ = toObservable(this.days).pipe(
        debounceTime(300),
        distinctUntilChanged(),
        startWith(this.days())
      );

      days$.pipe(
        switchMap(days => {
          console.log('🔄 Days changed, fetching gold data for:', days);
          this.isLoading.set(true);
          this.error.set(null);

          const to = dayjs().format('YYYY-MM-DD');
          const from = dayjs().subtract(days, 'days').format('YYYY-MM-DD');

          console.log('📡 Gold API call:', { from, to });

          return this.goldService.getGoldPrices(from, to).pipe(
            catchError(err => {
              console.error('❌ Gold API error:', err);
              this.error.set('Failed to load gold price data');
              return of([]);
            })
          );
        }),
        takeUntil(this.destroy$)
      ).subscribe(data => {
        console.log('✅ Gold data received:', data.length, 'points');
        this.goldPrices.set(data);
        this.isLoading.set(false);
      });
    });
  }

  onDaysChange(newDays: number) {
    this.days.set(newDays);
  }

  onDaysInput(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.days.set(+target.value);
    }
  }

  toggleDarkMode() {
    const newDarkMode = !this.isDark();
    this.isDark.set(newDarkMode);
    
    // Update document class for Tailwind dark mode
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';