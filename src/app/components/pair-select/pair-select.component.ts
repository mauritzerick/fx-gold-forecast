import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pair-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Base:</label>
        <select 
          [ngModel]="base()" 
          (ngModelChange)="onBaseChange($event)"
          class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option *ngFor="let currency of baseCurrencies" [value]="currency">
            {{ currency }}
          </option>
        </select>
      </div>

      <button
        (click)="onSwap()"
        class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        title="Swap currencies"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
        </svg>
      </button>

      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Quote:</label>
        <select 
          [ngModel]="quote()" 
          (ngModelChange)="onQuoteChange($event)"
          class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option *ngFor="let currency of quoteCurrencies()" [value]="currency">
            {{ currency }}
          </option>
        </select>
      </div>
    </div>
  `,
  styles: []
})
export class PairSelectComponent {
  base = input.required<string>();
  quote = input.required<string>();
  
  baseChange = output<string>();
  quoteChange = output<string>();
  swap = output<void>();

  baseCurrencies = ['USD', 'EUR', 'GBP', 'AUD', 'NZD', 'JPY', 'CHF', 'CAD', 'SGD', 'HKD'];

  // Use computed instead of effect for reactive quote currencies
  quoteCurrencies = computed(() => {
    const currentBase = this.base();
    return this.baseCurrencies.filter(c => c !== currentBase);
  });

  onBaseChange(newBase: string) {
    this.baseChange.emit(newBase);
  }

  onQuoteChange(newQuote: string) {
    this.quoteChange.emit(newQuote);
  }

  onSwap() {
    this.swap.emit();
  }

}
