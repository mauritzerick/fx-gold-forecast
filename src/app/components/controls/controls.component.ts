import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- History Controls -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">History</h3>
        
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Presets:</label>
          <div class="flex gap-2">
            <button
              *ngFor="let preset of historyPresets"
              type="button"
              (click)="onDaysChange(preset.days)"
              [class]="days() === preset.days ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
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
            [ngModel]="days()"
            (ngModelChange)="onDaysChange($event)"
            (input)="onDaysInput($event)"
            [min]="7"
            [max]="1500"
            class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      </div>

      <!-- Forecasting Controls -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Forecasting</h3>
        
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Alpha (α): {{ alpha() }}
            </label>
            <input
              type="range"
              [ngModel]="alpha()"
              (ngModelChange)="onAlphaChange($event)"
              [min]="0.1"
              [max]="0.9"
              [step]="0.01"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Beta (β): {{ beta() }}
            </label>
            <input
              type="range"
              [ngModel]="beta()"
              (ngModelChange)="onBetaChange($event)"
              [min]="0.1"
              [max]="0.9"
              [step]="0.01"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Horizon: {{ horizon() }} days
            </label>
            <input
              type="range"
              [ngModel]="horizon()"
              (ngModelChange)="onHorizonChange($event)"
              [min]="1"
              [max]="30"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>

      <!-- Indicators & Actions -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Indicators & Actions</h3>
        
        <div class="space-y-4">
          <!-- SMA -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">SMA</label>
              <input
                type="checkbox"
                [ngModel]="showSMA()"
                (ngModelChange)="onShowSMAChange($event)"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
            <input
              *ngIf="showSMA()"
              type="range"
              [ngModel]="smaWindow()"
              (ngModelChange)="onSmaWindowChange($event)"
              [min]="3"
              [max]="120"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div *ngIf="showSMA()" class="text-xs text-gray-500 dark:text-gray-400">
              Window: {{ smaWindow() }}
            </div>
          </div>

          <!-- EMA -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">EMA</label>
              <input
                type="checkbox"
                [ngModel]="showEMA()"
                (ngModelChange)="onShowEMAChange($event)"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
            <input
              *ngIf="showEMA()"
              type="range"
              [ngModel]="emaWindow()"
              (ngModelChange)="onEmaWindowChange($event)"
              [min]="3"
              [max]="120"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div *ngIf="showEMA()" class="text-xs text-gray-500 dark:text-gray-400">
              Window: {{ emaWindow() }}
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-2">
            <button
              type="button"
              (click)="onRefresh()"
              class="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Refresh
            </button>
            <button
              type="button"
              (click)="onDownloadCsv()"
              class="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Download CSV
            </button>
            <button
              type="button"
              (click)="onToggleTheme()"
              class="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              {{ isDark() ? 'Light' : 'Dark' }} Theme
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .slider::-webkit-slider-thumb {
      appearance: none;
      height: 20px;
      width: 20px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      box-shadow: 0 0 2px 0 #555;
    }

    .slider::-moz-range-thumb {
      height: 20px;
      width: 20px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      border: none;
      box-shadow: 0 0 2px 0 #555;
    }
  `]
})
export class ControlsComponent {
  // Inputs
  days = input.required<number>();
  alpha = input.required<number>();
  beta = input.required<number>();
  horizon = input.required<number>();
  smaWindow = input.required<number>();
  emaWindow = input.required<number>();
  showSMA = input.required<boolean>();
  showEMA = input.required<boolean>();
  isDark = input.required<boolean>();

  // Outputs
  daysChange = output<number>();
  alphaChange = output<number>();
  betaChange = output<number>();
  horizonChange = output<number>();
  smaWindowChange = output<number>();
  emaWindowChange = output<number>();
  showSMAChange = output<boolean>();
  showEMAChange = output<boolean>();
  refresh = output<void>();
  downloadCsv = output<void>();
  toggleTheme = output<void>();

  historyPresets = [
    { label: '90d', days: 90 },
    { label: '180d', days: 180 },
    { label: '1y', days: 365 }
  ];

  onDaysInput(event: Event) {
    // Prevent any default behavior that might cause page refresh
    event.preventDefault();
    event.stopPropagation();
    console.log('🚫 Days input event prevented');
  }

  onDaysChange(value: number) {
    console.log('🎯 Controls: Days changed to:', value);
    this.daysChange.emit(value);
  }

  onAlphaChange(value: number) {
    this.alphaChange.emit(value);
  }

  onBetaChange(value: number) {
    this.betaChange.emit(value);
  }

  onHorizonChange(value: number) {
    this.horizonChange.emit(value);
  }

  onSmaWindowChange(value: number) {
    this.smaWindowChange.emit(value);
  }

  onEmaWindowChange(value: number) {
    this.emaWindowChange.emit(value);
  }

  onShowSMAChange(value: boolean) {
    this.showSMAChange.emit(value);
  }

  onShowEMAChange(value: boolean) {
    this.showEMAChange.emit(value);
  }

  onRefresh() {
    this.refresh.emit();
  }

  onDownloadCsv() {
    this.downloadCsv.emit();
  }

  onToggleTheme() {
    this.toggleTheme.emit();
  }
}
