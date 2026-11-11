/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* eslint-disable @angular-eslint/prefer-inject */
/** Angular Imports */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Subscription, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';

import { TranslateService } from '@ngx-translate/core';
/** Custom Services */
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { AnalyticsDataSourceService } from '../services/analytics-data-source.service';
import { AnalyticsVisibilityService } from '../services/analytics-visibility.service';
import { DashboardExportService } from '../services/dashboard-export.service';
/** Custom Models */
import {
  AnalyticsDashboardDefinition,
  AnalyticsFilters,
  AnalyticsWidgetDefinition,
  AnalyticsWidgetState
} from '../models/analytics-dashboard.model';
/** Custom Imports */
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { DashboardWidgetComponent } from '../dashboard-widget/dashboard-widget.component';

@Component({
  selector: 'mifosx-analytics-dashboard',
  standalone: true,
  templateUrl: './dashboard-engine.component.html',
  styleUrls: ['./dashboard-engine.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatMenuModule,
    MatIconModule,
    DashboardWidgetComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardEngineComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) dashboard!: AnalyticsDashboardDefinition;
  @Input() offices: any[] = [];
  @Input() products: any[] = [];
  @Input() clientGroups: any[] = [];

  filtersForm!: UntypedFormGroup;
  visibleWidgets: AnalyticsWidgetDefinition[] = [];
  /** Reports installed on the server; null until known (or when the list cannot be read). */
  private availableReports: Set<string> | null = null;
  private reportsSubscription?: Subscription;
  /** True once the report list has been read (or failed); widgets load only after that. */
  private reportsChecked = false;
  widgetStateMap: Record<string, AnalyticsWidgetState> = {};

  private filtersSubscription?: Subscription;
  private loadSubscription?: Subscription;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private authenticationService: AuthenticationService,
    private analyticsDataSourceService: AnalyticsDataSourceService,
    private analyticsVisibilityService: AnalyticsVisibilityService,
    private dashboardExportService: DashboardExportService,
    private translateService: TranslateService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  get metricWidgets(): AnalyticsWidgetDefinition[] {
    return this.visibleWidgets.filter((widget) => widget.type === 'metric');
  }

  get chartWidgets(): AnalyticsWidgetDefinition[] {
    return this.visibleWidgets.filter((widget) => widget.type === 'chart');
  }

  ngOnInit(): void {
    this.updateVisibleWidgets();

    this.filtersForm = this.formBuilder.group({
      officeId: [this.resolveDefaultOfficeId()],
      timescale: ['Month'],
      productId: [''],
      clientGroupId: ['']
    });

    this.filtersSubscription = this.filtersForm.valueChanges.subscribe(() => {
      if (!this.reportsChecked) {
        return;
      }
      this.reloadDashboard();
      // Immediately mark for check so Branch dropdown and pin active state update before async reload
      this.changeDetectorRef.markForCheck();
    });

    // Widgets show as loading until the server's report list is known.
    this.widgetStateMap = this.loadingStates();
    this.reportsSubscription = this.analyticsDataSourceService.availableReports().subscribe((available) => {
      this.availableReports = available;
      this.reportsChecked = true;
      this.updateVisibleWidgets();
      this.reloadDashboard();
      this.changeDetectorRef.markForCheck();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dashboard']) {
      this.updateVisibleWidgets();
      if (this.filtersForm && this.reportsChecked) {
        this.reloadDashboard();
      }
    }
    if (
      changes['offices'] &&
      this.filtersForm &&
      !this.offices.some((office) => office.id === this.filtersForm.value.officeId)
    ) {
      this.filtersForm.patchValue(
        {
          officeId: this.resolveDefaultOfficeId()
        },
        { emitEvent: false }
      );
      if (this.reportsChecked) {
        this.reloadDashboard();
      }
    }
  }

  ngOnDestroy(): void {
    this.reportsSubscription?.unsubscribe();
    if (this.filtersSubscription) {
      this.filtersSubscription.unsubscribe();
    }

    if (this.loadSubscription) {
      this.loadSubscription.unsubscribe();
    }
  }

  exportAsCSV(): void {
    const widgetsData = this.visibleWidgets.map((widget) => ({
      id: widget.id,
      title: this.translateService.instant(widget.titleKey),
      state: this.widgetStateMap[widget.id]
    }));
    this.dashboardExportService.exportAsCSV(widgetsData, 'mifos-dashboard');
  }

  exportAsPDF(): void {
    const widgetsData = this.visibleWidgets.map((widget) => ({
      id: widget.id,
      title: this.translateService.instant(widget.titleKey),
      state: this.widgetStateMap[widget.id]
    }));
    this.dashboardExportService.exportAsPDF(widgetsData, 'mifos-dashboard');
  }

  reloadDashboard(forceRefresh: boolean = false): void {
    if (!this.visibleWidgets.length) {
      return;
    }

    if (forceRefresh) {
      this.analyticsDataSourceService.clearCache();
    }

    if (this.loadSubscription) {
      this.loadSubscription.unsubscribe();
    }

    const filters = this.filtersForm.getRawValue() as AnalyticsFilters;

    this.widgetStateMap = this.loadingStates();

    this.loadSubscription = forkJoin(
      this.visibleWidgets.map((widget) =>
        this.analyticsDataSourceService.loadWidget(widget, filters).pipe(
          map((state) => ({
            widgetId: widget.id,
            state
          })),
          catchError((error) => {
            console.error(`Dashboard widget failed to load - Adapter: ${widget.adapter}, ID: ${widget.id}`, error);
            return of({
              widgetId: widget.id,
              state: {
                loading: false,
                empty: true,
                error: true
              }
            });
          })
        )
      )
    ).subscribe({
      next: (results) => {
        this.widgetStateMap = results.reduce(
          (accumulator, result) => ({
            ...accumulator,
            [result.widgetId]: result.state
          }),
          {}
        );
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        console.error('Dashboard forkJoin error:', error);
        this.widgetStateMap = this.visibleWidgets.reduce(
          (accumulator, widget) => ({
            ...accumulator,
            [widget.id]: {
              loading: false,
              empty: true
            }
          }),
          {}
        );
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  onOfficeSelected(officeId: number): void {
    // Patch the form — this triggers valueChanges → reloadDashboard() + markForCheck()
    this.filtersForm.patchValue({ officeId });
    // Force immediate view update so pin turns orange and dropdown reflects new value
    this.changeDetectorRef.detectChanges();
  }

  private resolveDefaultOfficeId(): number | null {
    const credentials = this.authenticationService.getCredentials();
    const currentOfficeId = credentials?.officeId;

    if (currentOfficeId && this.offices.some((office) => office.id === currentOfficeId)) {
      return currentOfficeId;
    }

    return this.offices[0]?.id ?? null;
  }

  private loadingStates(): Record<string, AnalyticsWidgetState> {
    return this.visibleWidgets.reduce(
      (accumulator, widget) => ({
        ...accumulator,
        [widget.id]: {
          loading: true,
          empty: false
        }
      }),
      {}
    );
  }

  private updateVisibleWidgets(): void {
    const permitted = (this.dashboard?.widgets || []).filter((widget) =>
      this.analyticsVisibilityService.canView(widget.visibleTo)
    );
    const available = this.availableReports;
    this.visibleWidgets = available
      ? permitted.filter((widget) => this.analyticsDataSourceService.hasReportsFor(widget, available))
      : permitted;
  }
}
