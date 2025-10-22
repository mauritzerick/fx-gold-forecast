import { Component, input, OnChanges, SimpleChanges, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartData, ChartOptions, registerables } from 'chart.js';
import { ChartPoint } from '../../utils/time-series';

// Register Chart.js components
if (typeof window !== 'undefined') {
  Chart.register(...registerables);
}

@Component({
  selector: 'app-fx-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: []
})
export class FxChartComponent implements OnChanges, AfterViewInit {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  data = input.required<ChartPoint[]>();
  lastDate = input.required<string>();
  smaWindow = input.required<number>();
  emaWindow = input.required<number>();
  isDark = input.required<boolean>();

  private chart: Chart | null = null;

  ngAfterViewInit() {
    // Delay to ensure DOM is ready
    setTimeout(() => {
      this.updateChart();
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] || changes['lastDate'] || changes['smaWindow'] || changes['emaWindow'] || changes['isDark']) {
      this.updateChart();
    }
  }

  private updateChart() {
    if (!this.chartCanvas) {
      console.log('Chart canvas not found');
      return;
    }

    const chartData = this.data();
    const lastDate = this.lastDate();
    const isDark = this.isDark();

    console.log('Updating chart with data:', chartData.length, 'points');

    if (this.chart) {
      this.chart.destroy();
    }

    if (!chartData || chartData.length === 0) {
      console.log('No chart data available');
      return;
    }

    const labels = chartData.map(d => d.x);
    const actualData = chartData.map(d => d.actual).filter(v => v !== null);
    const fittedData = chartData.map(d => d.fitted).filter(v => v !== null);
    const forecastData = chartData.map(d => d.forecast).filter(v => v !== null);
    const smaData = chartData.map(d => d.sma).filter(v => v !== null);
    const emaData = chartData.map(d => d.ema).filter(v => v !== null);

    const datasets: any[] = [
      {
        label: 'Actual',
        data: chartData.map(d => d.actual),
        borderColor: '#3b82f6',
        backgroundColor: 'transparent',
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.1
      },
      {
        label: 'Fitted',
        data: chartData.map(d => d.fitted),
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0.1
      },
      {
        label: 'Forecast',
        data: chartData.map(d => d.forecast),
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [8, 8],
        pointRadius: 0,
        tension: 0.1
      }
    ];

    // Add confidence band
    const bandData = chartData.map(d => ({
      x: d.x,
      y: d.bandHi,
      y0: d.bandLo
    })).filter(d => d.y !== null && d.y0 !== null);

    if (bandData.length > 0) {
      datasets.push({
        label: 'Confidence Band',
        data: bandData,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'transparent',
        type: 'line',
        fill: '+1',
        pointRadius: 0,
        tension: 0.1
      });
    }

    // Add SMA if enabled
    if (smaData.length > 0) {
      datasets.push({
        label: `SMA (${this.smaWindow()})`,
        data: chartData.map(d => d.sma),
        borderColor: '#8b5cf6',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 6],
        pointRadius: 0,
        tension: 0.1
      });
    }

    // Add EMA if enabled
    if (emaData.length > 0) {
      datasets.push({
        label: `EMA (${this.emaWindow()})`,
        data: chartData.map(d => d.ema),
        borderColor: '#06b6d4',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0.1
      });
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: isDark ? '#9ca3af' : '#6b7280'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return value ? `${context.dataset.label}: ${value.toFixed(4)}` : '';
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: false
            },
            ticks: {
              color: isDark ? '#9ca3af' : '#6b7280',
              maxRotation: 45
            },
            grid: {
              color: isDark ? '#374151' : '#e5e7eb'
            }
          },
          y: {
            display: true,
            title: {
              display: false
            },
            ticks: {
              color: isDark ? '#9ca3af' : '#6b7280',
              callback: (value) => typeof value === 'number' ? value.toFixed(4) : value
            },
            grid: {
              color: isDark ? '#374151' : '#e5e7eb'
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    };

    this.chart = new Chart(this.chartCanvas.nativeElement, config);
  }
}
