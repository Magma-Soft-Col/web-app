/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

import {
  AnalyticsDetailItem,
  AnalyticsFilters,
  AnalyticsTimescale,
  AnalyticsWidgetAdapter,
  AnalyticsWidgetDefinition,
  AnalyticsWidgetState
} from '../models/analytics-dashboard.model';
import { buildDemoWidgetState, isAnalyticsDemoEnabled } from './analytics-demo-data';

/**
 * Fineract reports each widget reads. Several are not part of a standard
 * Fineract install (e.g. "Savings Summary"); widgets whose reports are missing
 * are not shown rather than failing on every load.
 */
const WIDGET_REPORTS: Partial<Record<AnalyticsWidgetAdapter, string[]>> = {
  'client-total': ['ClientTrendsByMonth'],
  'loan-total': ['LoanTrendsByMonth'],
  'collection-total': ['Demand Vs Collection'],
  'disbursement-total': ['Disbursal Vs Awaitingdisbursal'],
  'savings-total': ['Savings Summary'],
  'women-borrowers-total': ['Women Borrowers Report'],
  'rural-clients-total': ['Rural Clients Report'],
  'youth-clients-total': ['Youth Clients Report'],
  'average-loan-size-total': ['Loan Portfolio Report'],
  'client-loan-trends': [
    'ClientTrendsByMonth',
    'LoanTrendsByMonth'
  ],
  'collection-breakdown': ['Demand Vs Collection'],
  'disbursement-breakdown': ['Disbursal Vs Awaitingdisbursal'],
  'savings-growth-trends': ['Savings Growth Report'],
  'portfolio-growth-by-group': ['Portfolio Growth By Group'],
  'new-client-onboarding-trends': ['New Client Onboarding Report']
};

/*
 * Chart colours of the Magma Soft palette. Every value on this dashboard comes
 * from a Fineract report: when a report fails the widget shows an error and when
 * it returns nothing it shows "No data" (spec.md §11, never fake data).
 */
const CHART_PRIMARY = '#b34c00';
const CHART_SECONDARY = '#6a2e75'; // Magma Soft secondary purple
const CHART_NEUTRAL = '#8b97a6';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsDataSourceService {
  /** A period-over-period trend, only when it was actually computed from report data. */
  private getMetricTrend(percent: number, positive: boolean): { trendPercent?: number; trendPositive?: boolean } {
    return Number.isFinite(percent) ? { trendPercent: percent, trendPositive: positive } : {};
  }

  private http = inject(HttpClient);
  private translateService = inject(TranslateService);

  private reportCache = new Map<string, Observable<any>>();
  private availableReports$?: Observable<Set<string> | null>;

  /**
   * Names of the reports installed on the server, read once per session.
   * Emits null when the list cannot be read, so callers keep every widget and
   * each one reports its own error.
   */
  availableReports(): Observable<Set<string> | null> {
    if (isAnalyticsDemoEnabled()) {
      return of(null);
    }
    if (!this.availableReports$) {
      const params = new HttpParams().set('fields', 'reportName');
      this.availableReports$ = this.http.get<{ reportName: string }[]>('/reports', { params }).pipe(
        map((reports) => new Set((reports || []).map((report) => report.reportName))),
        catchError(() => of(null)),
        shareReplay(1)
      );
    }
    return this.availableReports$;
  }

  /** Whether every report the widget reads is installed. */
  hasReportsFor(widget: AnalyticsWidgetDefinition, available: Set<string>): boolean {
    return (WIDGET_REPORTS[widget.adapter] ?? []).every((report) => available.has(report));
  }
  /** Potentially better formatting? */
  loadWidget(widget: AnalyticsWidgetDefinition, filters: AnalyticsFilters): Observable<AnalyticsWidgetState> {
    if (isAnalyticsDemoEnabled()) {
      return of(buildDemoWidgetState(widget.adapter, this.getTimescaleLabels(filters.timescale)));
    }
    switch (widget.adapter) {
      case 'client-total':
        return this.loadTrendMetric(filters, 'client');
      case 'loan-total':
        return this.loadTrendMetric(filters, 'loan');
      case 'collection-total':
        return this.loadAmountMetric(filters, 'Demand Vs Collection');
      case 'disbursement-total':
        return this.loadAmountMetric(filters, 'Disbursal Vs Awaitingdisbursal');
      case 'savings-total':
        return this.loadSavingsMetric(filters);
      case 'women-borrowers-total':
        return this.loadInclusionMetric(filters, 'Women Borrowers Report');
      case 'rural-clients-total':
        return this.loadInclusionMetric(filters, 'Rural Clients Report');
      case 'youth-clients-total':
        return this.loadInclusionMetric(filters, 'Youth Clients Report');
      case 'average-loan-size-total':
        return this.loadAverageLoanSize(filters);
      case 'client-loan-trends':
        return this.loadTrendChart(filters);
      case 'collection-breakdown':
        return this.loadAmountChart(filters, 'Demand Vs Collection', 'labels.inputs.Amount Collected');
      case 'disbursement-breakdown':
        return this.loadAmountChart(filters, 'Disbursal Vs Awaitingdisbursal', 'labels.catalogs.Disbursement');
      case 'savings-growth-trends':
        return this.loadSavingsGrowthChart(filters);
      case 'portfolio-growth-by-group':
        return this.loadPortfolioGrowthByGroup(filters);
      case 'new-client-onboarding-trends':
        return this.loadNewClientOnboardingTrends(filters);
      default:
        return of({
          loading: false,
          empty: true
        });
    }
  }

  clearCache(): void {
    this.reportCache.clear();
    this.availableReports$ = undefined;
  }

  private loadTrendMetric(filters: AnalyticsFilters, type: 'client' | 'loan'): Observable<AnalyticsWidgetState> {
    return this.loadTrendSeries(filters, type).pipe(
      map((series) => {
        let trend: { trendPercent?: number; trendPositive?: boolean } = {};
        if (series.length >= 2) {
          const current = series[series.length - 1];
          const previous = series[series.length - 2];
          if (previous > 0) {
            const pct = ((current - previous) / previous) * 100;
            trend = this.getMetricTrend(Math.abs(pct), pct >= 0);
          }
        }
        return {
          loading: false,
          empty: false,
          metricValue: series.reduce((sum, value) => sum + value, 0),
          ...trend,
          contextKey: this.getTimescaleKey(filters.timescale)
        };
      })
    );
  }

  private loadAmountMetric(filters: AnalyticsFilters, reportName: string): Observable<AnalyticsWidgetState> {
    return this.runReport(reportName, this.buildReportParams(filters)).pipe(
      map((response) => {
        const [
          pending,
          complete
        ] = this.extractAmountPair(response, reportName);
        const net = complete - pending;
        const trend = pending > 0 ? this.getMetricTrend(Math.abs((net / pending) * 100), net >= 0) : {};
        return {
          loading: false,
          empty: false,
          metricValue: net,
          ...trend
        };
      })
    );
  }

  private loadSavingsMetric(filters: AnalyticsFilters): Observable<AnalyticsWidgetState> {
    return this.loadFirstRowMetric('Savings Summary', filters, [
      'savings',
      'total',
      'amount',
      'balance'
    ]);
  }

  private loadInclusionMetric(filters: AnalyticsFilters, reportName: string): Observable<AnalyticsWidgetState> {
    return this.loadFirstRowMetric(reportName, filters, [
      'count',
      'name',
      'category'
    ]);
  }

  private loadAverageLoanSize(filters: AnalyticsFilters): Observable<AnalyticsWidgetState> {
    return this.loadFirstRowMetric('Loan Portfolio Report', filters, [
      'average',
      'avg',
      'mean',
      'size'
    ]);
  }

  /** A metric read from the first row of a report; no trend, these reports carry no previous period. */
  private loadFirstRowMetric(
    reportName: string,
    filters: AnalyticsFilters,
    keywords: string[]
  ): Observable<AnalyticsWidgetState> {
    return this.runReport(reportName, this.buildReportParams(filters)).pipe(
      map((response: any[]) => {
        const firstRow = response?.[0];
        return {
          loading: false,
          empty: !firstRow,
          metricValue: firstRow ? this.findValueByKeywords(firstRow, keywords) : undefined
        };
      })
    );
  }

  private loadTrendChart(filters: AnalyticsFilters): Observable<AnalyticsWidgetState> {
    return forkJoin([
      this.loadTrendSeries(filters, 'client'),
      this.loadTrendSeries(filters, 'loan')
    ]).pipe(
      map(
        ([
          clients,
          loans
        ]) => ({
          loading: false,
          empty: clients.every((value) => value === 0) && loans.every((value) => value === 0),
          labels: this.getTimescaleLabels(filters.timescale),
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
            {
              labelKey: 'labels.inputs.Clients',
              value: clients.reduce((sum, value) => sum + value, 0)
            },
            {
              labelKey: 'labels.menus.Loans',
              value: loans.reduce((sum, value) => sum + value, 0)
            }
          ]
        })
      )
    );
  }

  private loadAmountChart(
    filters: AnalyticsFilters,
    reportName: string,
    completeLabelKey: string
  ): Observable<AnalyticsWidgetState> {
    return this.runReport(reportName, this.buildReportParams(filters)).pipe(
      map((response) => {
        const [
          pending,
          complete
        ] = this.extractAmountPair(response, reportName);
        const pendingAmount = Math.max(0, pending);
        const completeAmount = Math.max(0, complete);
        return {
          loading: false,
          empty: pendingAmount === 0 && completeAmount === 0,
          labels: [
            'labels.status.Pending',
            completeLabelKey
          ],
          translateLabels: true,
          datasets: [
            {
              labelKey: completeLabelKey,
              data: [
                pendingAmount,
                completeAmount
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
            {
              labelKey: 'labels.status.Pending',
              value: pendingAmount
            },
            {
              labelKey: completeLabelKey,
              value: completeAmount
            }
          ]
        };
      })
    );
  }

  private loadSavingsGrowthChart(filters: AnalyticsFilters): Observable<AnalyticsWidgetState> {
    return this.loadSeriesChart('Savings Growth Report', filters, 'labels.menus.Savings', [
      'amount',
      'balance',
      'savings'
    ]);
  }

  private loadNewClientOnboardingTrends(filters: AnalyticsFilters): Observable<AnalyticsWidgetState> {
    return this.loadSeriesChart('New Client Onboarding Report', filters, 'labels.text.New Clients', [
      'newclients',
      'count'
    ]);
  }

  /** One line series per period of the selected timescale, read from a report. */
  private loadSeriesChart(
    reportName: string,
    filters: AnalyticsFilters,
    labelKey: string,
    keywords: string[]
  ): Observable<AnalyticsWidgetState> {
    return this.runReport(reportName, this.buildReportParams(filters)).pipe(
      map((response: any[]) => {
        const labels = this.getTimescaleLabels(filters.timescale);
        const data = labels.map((label) => {
          const entry = (response || []).find((item) => this.resolveTrendLabel(item, filters.timescale) === label);
          return entry ? this.findValueByKeywords(entry, keywords) : 0;
        });
        return {
          loading: false,
          empty: data.every((v) => v === 0),
          labels,
          translateLabels: false,
          datasets: [
            {
              labelKey,
              data,
              backgroundColor: 'rgba(179, 76, 0, 0.12)',
              borderColor: CHART_PRIMARY,
              borderWidth: 2
            }
          ],
          details: [
            {
              labelKey,
              value: data.reduce((sum, v) => sum + v, 0)
            }
          ]
        };
      })
    );
  }

  private loadPortfolioGrowthByGroup(filters: AnalyticsFilters): Observable<AnalyticsWidgetState> {
    return this.runReport('Portfolio Growth By Group', this.buildReportParams(filters)).pipe(
      map((response: any[]) => {
        const rows = response || [];
        const labels = this.getTimescaleLabels(filters.timescale);
        const series = (group?: string) =>
          labels.map((label) => {
            const entry = rows.find(
              (item) =>
                this.resolveTrendLabel(item, filters.timescale) === label &&
                (!group || (item.group || '').toLowerCase().includes(group))
            );
            return Number(entry?.portfolio || entry?.amount || 0);
          });
        const portfolioSnapshot = series();
        return {
          loading: false,
          empty: portfolioSnapshot.every((v) => v === 0),
          labels,
          translateLabels: false,
          datasets: [
            {
              labelKey: 'labels.text.Active Borrowers',
              data: series('borrow'),
              backgroundColor: CHART_PRIMARY,
              borderColor: CHART_PRIMARY,
              borderWidth: 1
            },
            {
              labelKey: 'labels.text.Active Savers',
              data: series('sav'),
              backgroundColor: CHART_SECONDARY,
              borderColor: CHART_SECONDARY,
              borderWidth: 1
            },
            {
              labelKey: 'labels.text.Portfolio Snapshot',
              data: portfolioSnapshot,
              backgroundColor: CHART_NEUTRAL,
              borderColor: CHART_NEUTRAL,
              borderWidth: 1
            }
          ],
          details: [] as AnalyticsDetailItem[]
        };
      })
    );
  }

  private loadTrendSeries(filters: AnalyticsFilters, type: 'client' | 'loan'): Observable<number[]> {
    const reportName = this.getTrendReportName(filters.timescale, type);
    const labels = this.getTimescaleLabels(filters.timescale);
    const valueField = type === 'client' ? 'count' : 'lcount';

    return this.runReport(reportName, this.buildReportParams(filters)).pipe(
      map((response: any[]) =>
        labels.map((label) => {
          const entry = (response || []).find((item) => this.resolveTrendLabel(item, filters.timescale) === label);
          return Number(entry?.[valueField] || 0);
        })
      )
    );
  }

  private buildReportParams(filters: AnalyticsFilters): Record<string, string | number> {
    const params: Record<string, string | number> = {
      genericResultSet: 'false'
    };

    // Just avoid forcing an invalid id
    if (filters.officeId !== null && filters.officeId !== undefined) {
      params['R_officeId'] = filters.officeId;
    }

    // Note: productId is NOT sent to backend reports — most reports do not register this parameter
    // and sending it causes an "Input validation error: unknown report parameter" from the API.

    // Note: clientGroupId is NOT sent — most reports do not register this parameter
    // and sending it causes an "Input validation error: unknown report parameter" from the API.

    return params;
  }

  private runReport(reportName: string, params: Record<string, string | number>): Observable<any> {
    let httpParams = new HttpParams();
    const sortedParams = Object.keys(params).sort();

    sortedParams.forEach((key) => {
      httpParams = httpParams.set(key, `${params[key]}`);
    });

    const cacheKey = `${reportName}:${httpParams.toString()}`;
    const cached = this.reportCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const request$ = this.http.get(`/runreports/${reportName}`, { params: httpParams }).pipe(shareReplay(1));
    this.reportCache.set(cacheKey, request$);
    return request$;
  }

  private extractAmountPair(response: any[], reportName: string): [
    number,
    number
  ] {
    const firstRow = response?.[0] || {};
    const numericEntries = Object.entries(firstRow)
      .map(
        ([
          key,
          value
        ]) => ({
          key: key.toLowerCase(),
          value: Number(value)
        })
      )
      .filter((entry) => !Number.isNaN(entry.value));

    // Match by report field names first so we do not depend on raw object value ordering
    const pendingValue = this.findValueByKeys(numericEntries, [
      'pending',
      'awaiting',
      'demand'
    ]);
    const completeValue = this.findValueByKeys(
      numericEntries,
      reportName === 'Demand Vs Collection' ? [
            'collection',
            'collected'
          ] : [
            'disburs',
            'disbursement',
            'disbursal'
          ]
    );

    if (pendingValue !== undefined && completeValue !== undefined) {
      return [
        pendingValue,
        completeValue
      ];
    }

    // Keep a small numeric fallback for unexpected report shapes.
    const values = numericEntries.map((entry) => entry.value).slice(0, 2);

    return [
      values[0] || 0,
      values[1] || 0
    ];
  }

  private findValueByKeys(entries: { key: string; value: number }[], keys: string[]): number | undefined {
    return entries.find((entry) => keys.some((key) => entry.key.includes(key)))?.value;
  }

  private findValueByKeywords(row: Record<string, any>, keywords: string[]): number {
    const entries = Object.entries(row);
    for (const kw of keywords) {
      const found = entries.find(([k]) => k.toLowerCase().includes(kw));
      if (found !== undefined) {
        const num = Number(found[1]);
        if (!Number.isNaN(num)) {
          return num;
        }
      }
    }
    return 0;
  }

  private getTrendReportName(timescale: AnalyticsTimescale, type: 'client' | 'loan'): string {
    const base = type === 'client' ? 'ClientTrendsBy' : 'LoanTrendsBy';
    // Year uses Month reports as fallback (12 months = 1 year)
    const period = timescale === 'Year' ? 'Month' : timescale;
    return `${base}${period}`;
  }

  private resolveTrendLabel(entry: any, timescale: AnalyticsTimescale): string {
    switch (timescale) {
      case 'Day':
        return this.formatDayLabel(entry?.days);
      case 'Week':
        return `${entry?.Weeks ?? ''}`;
      case 'Month':
      case 'Year':
        return `${entry?.Months ?? ''}`;
      default:
        return '';
    }
  }

  private getTimescaleLabels(timescale: AnalyticsTimescale): string[] {
    const labels: string[] = [];
    const cursor = new Date();

    switch (timescale) {
      case 'Day':
        while (labels.length < 12) {
          cursor.setDate(cursor.getDate() - 1);
          labels.push(this.formatDayLabel(cursor));
        }
        break;
      case 'Week':
        while (labels.length < 12) {
          cursor.setDate(cursor.getDate() - 7);
          labels.push(`${this.getWeekNumber(cursor)}`);
        }
        break;
      case 'Year':
        // Show last 5 years
        while (labels.length < 5) {
          labels.push(`${cursor.getFullYear()}`);
          cursor.setFullYear(cursor.getFullYear() - 1);
        }
        break;
      case 'Month':
      default:
        while (labels.length < 12) {
          labels.push(cursor.toLocaleString(this.getActiveLocale(), { month: 'long' }));
          cursor.setMonth(cursor.getMonth() - 1);
        }
        break;
    }

    return labels.reverse();
  }

  private formatDayLabel(value: any): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return `${date.getDate()}/${date.getMonth() + 1}`;
  }

  private getWeekNumber(date: Date): number {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    return Math.ceil(((date.getTime() - firstDay.getTime()) / 86400000 + firstDay.getDay() + 1) / 7);
  }

  private getActiveLocale(): string {
    // Reuse the active month labels to follow the selected translation locale
    return this.translateService.currentLang || this.translateService.defaultLang || 'en-US';
  }

  private getTimescaleKey(timescale: AnalyticsTimescale): string {
    switch (timescale) {
      case 'Day':
        return 'labels.buttons.Day';
      case 'Week':
        return 'labels.buttons.Week';
      case 'Year':
        return 'labels.buttons.Year';
      case 'Month':
      default:
        return 'labels.buttons.Month';
    }
  }
}
