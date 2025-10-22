import { Component, input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
if (typeof window !== 'undefined') {
  Chart.register(...registerables);
}

export interface GoldChartPoint {
  x: string;
  actual: number | null;
  fitted: number | null;
  forecast: number | null;
  bandHi: number | null;
  bandLo: number | null;
}

@Component({
  selector: 'app-gold-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: []
})
export class GoldChartComponent implements OnChanges, AfterViewInit {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  data = input.required<GoldChartPoint[]>();
  isDark = input.required<boolean>();

  private chart: Chart | null = null;

  ngAfterViewInit() {
    // Delay to ensure DOM is ready
    setTimeout(() => {
      this.updateChart();
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('📈 Chart ngOnChanges:', changes);
    if (changes['data'] || changes['isDark']) {
      console.log('🔄 Chart data changed, updating chart');
      this.updateChart();
    }
  }

  private updateChart() {
    const chartData = this.data();
    const isDark = this.isDark();

    console.log('📊 Updating chart with data:', chartData.length, 'points');

    if (!chartData || chartData.length === 0) {
      console.log('❌ No chart data available');
      return;
    }

    // Destroy existing chart
    if (this.chart) {
      console.log('🗑️ Destroying existing chart');
      this.chart.destroy();
      this.chart = null;
    }

    // Filter out null values for actual data
    const actualData = chartData
      .filter(d => d.actual !== null)
      .map(d => ({ x: d.x, y: d.actual! }));

    const datasets: any[] = [
      {
        label: 'Gold Price (AUD/kg)',
        data: actualData,
        borderColor: '#f59e0b', // Amber-500
        backgroundColor: 'transparent',
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.1,
        fill: false
      }
    ];

    const config: ChartConfiguration = {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: isDark ? '#9ca3af' : '#6b7280',
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: isDark ? '#374151' : '#ffffff',
            titleColor: isDark ? '#f9fafb' : '#111827',
            bodyColor: isDark ? '#d1d5db' : '#374151',
            borderColor: isDark ? '#6b7280' : '#d1d5db',
            borderWidth: 1,
            callbacks: {
              title: (context) => {
                const x = context[0].parsed.x;
                if (x !== null && x !== undefined) {
                  const date = new Date(x);
                  return date.toLocaleDateString();
                }
                return '';
              },
              label: (context) => {
                const y = context.parsed.y;
                if (y !== null && y !== undefined) {
                  return `${context.dataset.label}: $${y.toLocaleString()}`;
                }
                return '';
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              parser: 'yyyy-MM-dd',
              displayFormats: {
                day: 'MMM dd',
                week: 'MMM dd',
                month: 'MMM yyyy'
              }
            },
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
              display: true,
              text: 'Price (AUD)',
              color: isDark ? '#9ca3af' : '#6b7280'
            },
            ticks: {
              color: isDark ? '#9ca3af' : '#6b7280',
              callback: function(value) {
                return '$' + Number(value).toLocaleString();
              }
            },
            grid: {
              color: isDark ? '#374151' : '#e5e7eb'
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        elements: {
          point: {
            radius: 0,
            hoverRadius: 6
          }
        }
      }
    };

    try {
      this.chart = new Chart(this.chartCanvas.nativeElement, config);
      console.log('✅ Chart created successfully');
    } catch (error) {
      console.error('❌ Error creating chart:', error);
    }
  }
}