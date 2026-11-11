/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, HostListener, OnInit, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';
/**
 * Interface for version information.
 */
export interface VersionInfo {
  tenant?: string;
  mifos?: string;
  fineract?: {
    version?: string;
  };
}

/** Custom Models */
import { Alert } from '../core/alert/alert.model';

/** Custom Services */
import { AuthenticationService } from '../core/authentication/authentication.service';
import { AlertService } from '../core/alert/alert.service';
import { ThemingService } from '../shared/theme-toggle/theming.service';
import { TranslateService } from '@ngx-translate/core';

/** Environment Imports */
import { environment } from '../../environments/environment';
import { BrandAssetsService } from 'app/shared/ui-theme/brand-assets.service';
import { SettingsService } from 'app/settings/settings.service';
import { LanguageSelectorComponent } from '../shared/language-selector/language-selector.component';
import { ThemeToggleComponent } from '../shared/theme-toggle/theme-toggle.component';
import { ServerSelectorComponent } from '../shared/server-selector/server-selector.component';
import { TenantSelectorComponent } from '../shared/tenant-selector/tenant-selector.component';
import { LoginFormComponent } from './login-form/login-form.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { TwoFactorAuthenticationComponent } from './two-factor-authentication/two-factor-authentication.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { M3IconComponent } from '../shared/m3-ui/m3-icon/m3-icon.component';

import { VersionService } from '../system/version.service';
import { sanitizeReturnUrl } from '../core/utils/return-url.utils';
import { launchSplash } from '../core/splash/splash';

/** Bundled Magma Soft logos, used when no tenant or Settings logo is configured. */
const MAGMA_LOGO = 'assets/images/magma/logo-horizontal.png';
const MAGMA_LOGO_DARK = 'assets/images/magma/logo-horizontal-oscuro.png';

/**
 * Login component.
 */
@Component({
  selector: 'mifosx-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    LanguageSelectorComponent,
    ThemeToggleComponent,
    ServerSelectorComponent,
    TenantSelectorComponent,
    LoginFormComponent,
    ResetPasswordComponent,
    TwoFactorAuthenticationComponent,
    M3IconComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  /** Whether to show the tenant selector dropdown */
  showTenantSelector = true;
  /** Show version info table if env allows */
  displayBackendInfo = environment.displayBackEndInfo !== 'false';

  private alertService = inject(AlertService);
  private settingsService = inject(SettingsService);
  private themingService = inject(ThemingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private versionService = inject(VersionService);
  private translateService = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private authenticationService = inject(AuthenticationService);

  public environment = environment;

  /** Version info for display */
  versions: VersionInfo = {};
  /** Server info for display */
  server: string = '';

  /** Get tenant display name with first letter capitalized */
  get tenantDisplayName(): string {
    const tenant = this.versions?.tenant || this.settingsService.tenantIdentifier || 'default';
    return tenant.charAt(0).toUpperCase() + tenant.slice(1).toLowerCase();
  }

  /** True if password requires a reset. */
  resetPassword = false;
  /** True if user requires two factor authentication. */
  twoFactorAuthenticationRequired = false;
  private brandAssets = inject(BrandAssetsService);

  /** Logo chosen in Settings for this tenant, preferred over the bundled one. */
  get brandLogo(): string | null {
    const assets = this.brandAssets.assets();
    return assets.logoWithName ?? assets.logo ?? null;
  }

  logoPath = MAGMA_LOGO;
  logoPathDark = MAGMA_LOGO_DARK;

  /** The reload-settings button is a support tool: hidden until Ctrl + Alt + R. */
  readonly showReloadSettings = signal(false);

  /** A signal so the OnPush view swaps the logo when the theme changes. */
  readonly themeDarkEnabled = signal(false);

  /**
   * Subscribes to alert event of alert service and theme changes.
   */
  ngOnInit() {
    if (this.authenticationService.isAuthenticated()) {
      this.router.navigateByUrl(this.preservedReturnUrl(), { replaceUrl: true });
      return;
    }

    this.showTenantSelector = this.calculateTenantSelectorVisibility();
    this.updateLogo();
    this.themeDarkEnabled.set(!!this.settingsService.themeDarkEnabled);
    // Subscribe to theme changes
    this.themingService.theme.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.themeDarkEnabled.set(!!this.settingsService.themeDarkEnabled);
    });

    // Initialize theme based on settings
    this.themingService.setDarkMode(!!this.settingsService.themeDarkEnabled);

    // Subscribe to alerts
    this.alertService.alertEvent.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((alertEvent: Alert) => {
      const alertType = alertEvent.type;
      if (alertType === this.translateService.instant('errors.auth.passwordExpired.type')) {
        this.twoFactorAuthenticationRequired = false;
        this.resetPassword = true;
      } else if (alertType === this.translateService.instant('errors.auth.twoFactor.type')) {
        this.resetPassword = false;
        this.twoFactorAuthenticationRequired = true;
      } else if (alertType === this.translateService.instant('errors.auth.success.type')) {
        this.resetPassword = false;
        this.twoFactorAuthenticationRequired = false;
        launchSplash();
        this.router.navigateByUrl(this.preservedReturnUrl(), { replaceUrl: true });
      } else if (alertType === this.translateService.instant('errors.tenant.changed.type')) {
        this.updateLogo();
      }
    });

    // Load version info for table
    this.versionService
      .getBackendInfo()
      .pipe(take(1))
      .subscribe(
        (info: any) => {
          this.versions = {
            tenant: this.settingsService.tenantIdentifier,
            mifos: info?.mifos || info?.mifosX || info?.mifos_x || info?.version || environment.version,
            fineract:
              typeof info?.fineract === 'object' && info?.fineract !== null
                ? { version: info.fineract.version }
                : typeof info?.fineract === 'string'
                  ? { version: info.fineract }
                  : info?.fineractX || info?.fineract_x
                    ? { version: info.fineractX || info.fineract_x }
                    : { version: info?.git?.build?.version }
          };
        },
        () => {
          this.versions = {
            tenant: this.settingsService.tenantIdentifier,
            mifos: environment.version,
            fineract: { version: '' }
          };
        }
      );
    this.server = this.settingsService.server;
  }

  /**
   * Destination the authentication guard preserved before redirecting here.
   * @returns {string} The requested route, or the dashboard when none is safe to restore.
   */
  private preservedReturnUrl(): string {
    return sanitizeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'r') {
      event.preventDefault();
      this.showReloadSettings.update((visible) => !visible);
    }
  }

  reloadSettings(): void {
    this.settingsService.setTenantIdentifier('');
    this.settingsService.setTenantIdentifier(environment.fineractPlatformTenantId || 'default');
    this.settingsService.setTenantIdentifiers(environment.fineractPlatformTenantIds.split(','));
    this.settingsService.setServers(environment.baseApiUrls.split(','));
    window.location.reload();
  }

  private calculateTenantSelectorVisibility(): boolean {
    if (environment.oauth.enabled) {
      return false;
    }
    if (environment.displayTenantSelector === 'false') {
      return false;
    }
    // The configured list, plus any identifier tenant management has seen on this installation, so
    // a deployment that registers tenants through the API does not have to also list them in the
    // environment as well. Without that feature the second list is empty and this is the configured
    // list unchanged.
    const configured: string[] = environment.fineractPlatformTenantIds.split(',');
    const known: string[] = this.settingsService.tenantIdentifiers ?? [];
    const tenantIds = [
      ...new Set([
        ...configured,
        ...known
      ])
    ]
      .map((id: string) => id.trim())
      .filter((id: string) => id.length > 0);
    if (tenantIds.length === 0 || (tenantIds.length === 1 && tenantIds[0] === 'default')) {
      return false;
    }
    return true;
  }

  allowServerSwitch(): boolean {
    return environment.allowServerSwitch === 'false' ? false : true;
  }

  updateLogo(): void {
    const tenant = this.settingsService.tenantIdentifier;
    const isTenantSpecific = tenant && tenant !== 'default';

    // Set light mode logo (env override takes priority)
    if (environment.tenantLogoUrl && environment.tenantLogoUrl.trim() !== '') {
      this.logoPath = environment.tenantLogoUrl;
    } else {
      this.logoPath = isTenantSpecific ? `assets/images/${tenant}_home.png` : MAGMA_LOGO;
    }

    // Set dark mode logo (env override takes priority)
    if (environment.tenantLogoUrlDark && environment.tenantLogoUrlDark.trim() !== '') {
      this.logoPathDark = environment.tenantLogoUrlDark;
    } else {
      this.logoPathDark = isTenantSpecific ? `assets/images/${tenant}_home_dark.png` : MAGMA_LOGO_DARK;
    }
  }

  onLogoError(): void {
    this.logoPath = MAGMA_LOGO;
  }

  onLogoErrorDark(): void {
    this.logoPathDark = MAGMA_LOGO_DARK;
  }
}
