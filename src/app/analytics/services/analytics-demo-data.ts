/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { environment } from 'environments/environment';
import { AnalyticsWidgetAdapter, AnalyticsWidgetState } from '../models/analytics-dashboard.model';

/*
 * TEMPORARY demo data for the Global Financial Dashboard (product screenshots).
 * These values are illustrative and do NOT come from Fineract. On in development
 * builds (ng serve), never in production builds. To see the real reports while
 * developing, run localStorage.setItem('mifosxAnalyticsDemo', 'false') in the
 * browser console. Delete this file and its two call sites in
 * AnalyticsDataSourceService once real reports exist.
 */
const DEMO_STORAGE_KEY = 'mifosxAnalyticsDemo';

const CHART_PRIMARY = '#b34c00';
const CHART_SECONDARY = '#6a2e75';
const CHART_NEUTRAL = '#8b97a6';

export function isAnalyticsDemoEnabled(): boolean {
  try {
    return !environment.production && localStorage.getItem(DEMO_STORAGE_KEY) !== 'false';
  } catch {
    return false;
  }
}

/** A smooth, growing series so the charts look alive without being random. */
function series(points: number, base: number, growth: number, wave: number, phase = 0): number[] {
  return Array.from({ length: points }, (_, i) =>
    Math.round(base * (1 + growth * i) + base * wave * Math.sin(i * 0.9 + phase))
  );
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const metric = (metricValue: number, trendPercent: number, trendPositive = true): AnalyticsWidgetState => ({
  loading: false,
  empty: false,
  metricValue,
  trendPercent,
  trendPositive
});

export function buildDemoWidgetState(adapter: AnalyticsWidgetAdapter, labels: string[]): AnalyticsWidgetState {
  const points = labels.length;

  switch (adapter) {
    case 'client-total':
      return metric(1248, 8.42);
    case 'loan-total':
      return metric(932, 12.15);
    case 'collection-total':
      return metric(486250000, 6.31);
    case 'disbursement-total':
      return metric(1240000000, 9.84);
    case 'savings-total':
      return metric(2180500000, 4.27);
    case 'women-borrowers-total':
      return metric(548, 5.63);
    case 'rural-clients-total':
      return metric(312, 3.18);
    case 'youth-clients-total':
      return metric(287, 7.92);
    case 'average-loan-size-total':
      return metric(3450000, 1.36, false);

    case 'client-loan-trends': {
      const clients = series(points, 64, 0.09, 0.12);
      const loans = series(points, 48, 0.11, 0.15, 1.2);
      return {
        loading: false,
        empty: false,
        labels,
        translateLabels: false,
        datasets: [
          {
            labelKey: 'labels.inputs.Clients',
            data: clients,
            backgroundColor: CHART_PRIMARY,
            borderColor: CHART_PRIMARY,
            borderWidth: 1
          },
          {
            labelKey: 'labels.menus.Loans',
            data: loans,
            backgroundColor: CHART_SECONDARY,
            borderColor: CHART_SECONDARY,
            borderWidth: 1
          }
        ],
        details: [
          { labelKey: 'labels.inputs.Clients', value: sum(clients) },
          { labelKey: 'labels.menus.Loans', value: sum(loans) }
        ]
      };
    }

    case 'portfolio-growth-by-group':
      return {
        loading: false,
        empty: false,
        labels,
        translateLabels: false,
        datasets: [
          {
            labelKey: 'labels.text.Active Borrowers',
            data: series(points, 420000000, 0.08, 0.04),
            backgroundColor: CHART_PRIMARY,
            borderColor: CHART_PRIMARY,
            borderWidth: 2,
            tension: 0.35
          },
          {
            labelKey: 'labels.text.Active Savers',
            data: series(points, 310000000, 0.06, 0.05, 0.8),
            backgroundColor: CHART_SECONDARY,
            borderColor: CHART_SECONDARY,
            borderWidth: 2,
            tension: 0.35
          },
          {
            labelKey: 'labels.text.Portfolio Snapshot',
            data: series(points, 520000000, 0.07, 0.03, 1.6),
            backgroundColor: CHART_NEUTRAL,
            borderColor: CHART_NEUTRAL,
            borderWidth: 2,
            tension: 0.35
          }
        ],
        details: []
      };

    case 'savings-growth-trends': {
      const savings = series(points, 1450000000, 0.04, 0.02);
      return {
        loading: false,
        empty: false,
        labels,
        translateLabels: false,
        datasets: [
          {
            labelKey: 'labels.menus.Savings',
            data: savings,
            backgroundColor: 'rgba(179, 76, 0, 0.15)',
            borderColor: CHART_PRIMARY,
            borderWidth: 2,
            fill: true,
            tension: 0.35
          }
        ],
        details: [{ labelKey: 'labels.menus.Savings', value: savings[savings.length - 1] }]
      };
    }

    case 'new-client-onboarding-trends': {
      const onboarded = series(points, 38, 0.1, 0.2, 0.4);
      return {
        loading: false,
        empty: false,
        labels,
        translateLabels: false,
        datasets: [
          {
            labelKey: 'labels.text.New Client Onboarding Trends',
            data: onboarded,
            backgroundColor: 'rgba(106, 46, 117, 0.15)',
            borderColor: CHART_SECONDARY,
            borderWidth: 2,
            fill: true,
            tension: 0.35
          }
        ],
        details: [{ labelKey: 'labels.inputs.Clients', value: sum(onboarded) }]
      };
    }

    case 'disbursement-breakdown':
    case 'collection-breakdown': {
      const completeKey =
        adapter === 'disbursement-breakdown' ? 'labels.catalogs.Disbursement' : 'labels.inputs.Amount Collected';
      const pending = adapter === 'disbursement-breakdown' ? 215000000 : 92400000;
      const complete = adapter === 'disbursement-breakdown' ? 1240000000 : 486250000;
      return {
        loading: false,
        empty: false,
        labels: [
          'labels.status.Pending',
          completeKey
        ],
        translateLabels: true,
        datasets: [
          {
            labelKey: completeKey,
            data: [
              pending,
              complete
            ],
            backgroundColor: [
              CHART_NEUTRAL,
              CHART_PRIMARY
            ],
            borderWidth: 1,
            borderColor: '#ffffff'
          }
        ],
        details: [
          { labelKey: 'labels.status.Pending', value: pending },
          { labelKey: completeKey, value: complete }
        ]
      };
    }

    default:
      return { loading: false, empty: true };
  }
}
