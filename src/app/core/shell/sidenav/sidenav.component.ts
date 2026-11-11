/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { environment } from 'environments/environment';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  OnInit,
  TemplateRef,
  ViewChild,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLinkActive } from '@angular/router';
import { MatTooltip } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { filter } from 'rxjs/operators';

/** Custom Services */
import { AuthenticationService } from '../../authentication/authentication.service';
import { PopoverService } from '../../../configuration-wizard/popover/popover.service';
import { ConfigurationWizardService } from '../../../configuration-wizard/configuration-wizard.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { hasAnyPermission } from 'app/directives/has-permission/has-permission.directive';
import { remittanceConfig } from '../../../remittances/remittance.config';
import { BrandAssetsService } from 'app/shared/ui-theme/brand-assets.service';
import { NAV_DISPLAY_ORDER, NAV_SECTIONS, NavLink, NavSection } from './nav-sections';

/** A section with only the links the current user may see. */
interface VisibleSection extends NavSection {
  /** Where the section entry navigates: its first visible link. */
  route: string;
}

/**
 * Sidenav component: primary navigation of the shell.
 */
@Component({
  selector: 'mifosx-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTooltip,
    FaIconComponent,
    RouterLinkActive
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidenavComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private authenticationService = inject(AuthenticationService);
  private configurationWizardService = inject(ConfigurationWizardService);
  private popoverService = inject(PopoverService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  /** Logo images chosen in Settings, if any. */
  readonly brandAssets = inject(BrandAssetsService);

  /** True if sidenav is in collapsed state. */
  @Input() sidenavCollapsed: boolean;

  /** Feature flags that gate individual links. */
  readonly cbIldEnabled = environment.cbIldEnabled;
  readonly mifosRemittanceEnabled = remittanceConfig.isRemittanceEnabled;

  /** Sections the user can reach, in the order of the approved design. */
  sections: VisibleSection[] = [];
  /** Id of the section the current URL belongs to. */
  activeSectionId: string | null = null;

  /* Reference of logo */
  @ViewChild('logo') logo: ElementRef<any>;
  /* Template for popover on logo */
  @ViewChild('templateLogo') templateLogo: TemplateRef<any>;

  ngOnInit() {
    this.sections = this.buildSections();
    this.updateActiveSection(this.router.url);
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        this.updateActiveSection(event.urlAfterRedirects);
        this.cdr.markForCheck();
      });
  }

  /**
   * Keeps only the links the user may see; a section without any is dropped.
   */
  private buildSections(): VisibleSection[] {
    const permissions: string[] = this.authenticationService.getCredentials()?.permissions ?? [];
    const rbacEnabled = environment.productionModeEnableRBAC;
    const isVisible = (link: NavLink) =>
      (!link.flag || this[link.flag]) &&
      (!link.permission || hasAnyPermission(permissions, link.permission, rbacEnabled));

    return NAV_DISPLAY_ORDER.map((id) => NAV_SECTIONS.find((section) => section.id === id))
      .map((section) => ({ ...section, links: section.links.filter(isVisible) }))
      .filter((section) => section.links.length > 0)
      .map((section) => ({ ...section, route: section.links[0].route }));
  }

  /**
   * The first section (in NAV_SECTIONS order, most specific first) whose
   * patterns match the URL; loan accounts under a client belong to Créditos.
   */
  private updateActiveSection(url: string): void {
    const path = url.split('#').pop();
    const match = NAV_SECTIONS.find((section) => section.match.some((pattern) => pattern.test(path)));
    this.activeSectionId = match?.id ?? null;
  }

  /**
   * Popover function
   * @param template TemplateRef<any>.
   * @param target HTMLElement | ElementRef<any>.
   * @param position String.
   * @param backdrop Boolean.
   */
  showPopover(
    template: TemplateRef<any>,
    target: HTMLElement | ElementRef<any>,
    position: string,
    backdrop: boolean
  ): void {
    if (!target) {
      return;
    }
    setTimeout(() => this.popoverService.open(template, target, position, backdrop, {}), 200);
  }

  /**
   * Steps of the sidenav tour. Only the brand remains a fixed target now that
   * the menu is generated; the tour skips a step whose target is not rendered.
   */
  private get sidenavTourSteps(): {
    name: string;
    template: TemplateRef<any>;
    target: ElementRef<any> | undefined;
    position: string;
  }[] {
    return [{ name: 'logo', template: this.templateLogo, target: this.logo, position: 'bottom' }];
  }

  private showTourStep(step?: { template: TemplateRef<any>; target: ElementRef<any>; position: string }): void {
    if (step) {
      this.showPopover(step.template, step.target, step.position, true);
    }
  }

  /**
   * Shows the next rendered sidenav tour step, or moves on to the breadcrumbs.
   * @param current Name of the current step.
   */
  showNextTourStep(current: string): void {
    const steps = this.sidenavTourSteps;
    const currentIndex = steps.findIndex((step) => step.name === current);
    const next = steps.slice(currentIndex + 1).find((step) => step.target);
    if (next) {
      this.showTourStep(next);
    } else {
      this.nextStep();
    }
  }

  /**
   * Shows the previous rendered sidenav tour step, or returns to the toolbar.
   * @param current Name of the current step.
   */
  showPreviousTourStep(current: string): void {
    const steps = this.sidenavTourSteps;
    const currentIndex = steps.findIndex((step) => step.name === current);
    const previous = steps
      .slice(0, currentIndex)
      .reverse()
      .find((step) => step.target);
    if (previous) {
      this.showTourStep(previous);
    } else {
      this.previousStep();
    }
  }

  /**
   * To show popovers
   */
  ngAfterViewInit() {
    if (this.configurationWizardService.showSideNav || this.configurationWizardService.showSideNavChartofAccounts) {
      setTimeout(() => {
        this.showTourStep(this.sidenavTourSteps.find((step) => step.target));
      });
    }
  }

  /**
   * Next Step (Breadcrumbs) Configuration Wizard.
   */
  nextStep() {
    this.configurationWizardService.showSideNav = false;
    this.configurationWizardService.showSideNavChartofAccounts = false;
    this.configurationWizardService.showBreadcrumbs = true;
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.router.navigate(['/home']);
  }

  /**
   * Previous Step (Toolbar) Configuration Wizard.
   */
  previousStep() {
    this.configurationWizardService.showSideNav = false;
    this.configurationWizardService.showSideNavChartofAccounts = false;
    this.configurationWizardService.showToolbarAdmin = true;
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.router.navigate(['/home']);
  }
}
