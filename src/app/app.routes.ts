import { Routes } from '@angular/router';
import { FxPageComponent } from './pages/fx-page.component';
import { GoldPageComponent } from './pages/gold-page.component';
import { GoldOzPageComponent } from './pages/gold-oz-page.component';

export const routes: Routes = [
  {
    path: '',
    component: FxPageComponent,
    title: 'FX Forecaster'
  },
  {
    path: 'gold',
    component: GoldPageComponent,
    title: 'Gold Price Forecaster (KG)'
  },
  {
    path: 'gold-oz',
    component: GoldOzPageComponent,
    title: 'Gold Price Forecaster (OZ)'
  }
];
