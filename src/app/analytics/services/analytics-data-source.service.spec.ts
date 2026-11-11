/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError, firstValueFrom } from 'rxjs';

import { AnalyticsDataSourceService } from './analytics-data-source.service';
import { AnalyticsFilters, AnalyticsWidgetDefinition } from '../models/analytics-dashboard.model';

// The temporary demo data (analytics-demo-data.ts) is on in development builds; test the real reports.
jest.mock('./analytics-demo-data', () => ({ isAnalyticsDemoEnabled: () => false, buildDemoWidgetState: jest.fn() }));

describe('AnalyticsDataSourceService', () => {
  let service: AnalyticsDataSourceService;
  let http: { get: jest.Mock };
  const filters = { timescale: 'Month', officeId: 1 } as AnalyticsFilters;
  const widget = (adapter: string) => ({ id: adapter, adapter }) as unknown as AnalyticsWidgetDefinition;

  beforeEach(() => {
    http = { get: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        AnalyticsDataSourceService,
        { provide: HttpClient, useValue: http },
        { provide: TranslateService, useValue: { currentLang: 'es-MX', defaultLang: 'en-US' } }
      ]
    });
    service = TestBed.inject(AnalyticsDataSourceService);
  });

  it('lets a failed report surface as an error instead of inventing a value', async () => {
    http.get.mockReturnValue(throwError(() => new Error('500')));

    await expect(firstValueFrom(service.loadWidget(widget('savings-total'), filters))).rejects.toThrow('500');
    await expect(firstValueFrom(service.loadWidget(widget('client-loan-trends'), filters))).rejects.toThrow();
  });

  it('reports a real zero and no trend when the report has no activity', async () => {
    http.get.mockReturnValue(of([]));

    const state = await firstValueFrom(service.loadWidget(widget('client-total'), filters));

    expect(state.metricValue).toBe(0);
    expect(state.trendPercent).toBeUndefined();
  });

  it('marks a chart empty when the report returns only zeros', async () => {
    http.get.mockReturnValue(of([{ pending: 0, disbursal: 0 }]));

    const state = await firstValueFrom(service.loadWidget(widget('disbursement-breakdown'), filters));

    expect(state.empty).toBe(true);
    expect(state.datasets?.[0].data).toEqual([
      0,
      0
    ]);
  });

  it('shows the amounts the report returned, without forcing a pending share', async () => {
    http.get.mockReturnValue(of([{ pending: 0, disbursal: 1200 }]));

    const state = await firstValueFrom(service.loadWidget(widget('disbursement-breakdown'), filters));

    expect(state.datasets?.[0].data).toEqual([
      0,
      1200
    ]);
  });

  it('knows which widgets the installed reports can feed', async () => {
    http.get.mockReturnValue(
      of([
        { reportName: 'ClientTrendsByMonth' },
        { reportName: 'LoanTrendsByMonth' }
      ])
    );

    const available = await firstValueFrom(service.availableReports());

    expect(service.hasReportsFor(widget('client-loan-trends'), available!)).toBe(true);
    expect(service.hasReportsFor(widget('savings-total'), available!)).toBe(false);
  });

  it('reads the report list once and keeps every widget when it cannot be read', async () => {
    http.get.mockReturnValue(throwError(() => new Error('403')));

    expect(await firstValueFrom(service.availableReports())).toBeNull();
    await firstValueFrom(service.availableReports());
    expect(http.get).toHaveBeenCalledTimes(1);
  });
});
