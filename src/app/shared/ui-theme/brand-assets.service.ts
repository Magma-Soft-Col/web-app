/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject, signal } from '@angular/core';

import { SettingsService } from 'app/settings/settings.service';

/** Images the Settings page lets the user replace. */
export type BrandAssetKey = 'favicon' | 'cover' | 'logo' | 'logoWithName';

export type BrandAssets = Partial<Record<BrandAssetKey, string>>;

/** Largest image accepted, so the browser storage quota is not exhausted. */
export const BRAND_ASSET_MAX_BYTES = 512 * 1024;

/** Image types accepted for brand assets. */
export const BRAND_ASSET_ACCEPT = '.png,.jpg,.jpeg,.svg,.webp,.ico';

/**
 * Brand images (logo, logo with organisation name, favicon, cover) chosen in
 * Settings. Fineract's branding API only stores the primary colour, so these
 * are kept in this browser, per tenant, as data URLs.
 */
@Injectable({ providedIn: 'root' })
export class BrandAssetsService {
  private settingsService = inject(SettingsService);

  private readonly storageKey = 'mifosXBrandAssets';

  /** Assets of the current tenant. */
  readonly assets = signal<BrandAssets>({});

  /** Loads the current tenant's assets and applies the favicon. */
  restore(): void {
    this.assets.set(this.readAll()[this.tenant] ?? {});
    this.applyFavicon();
  }

  /**
   * Saves the given assets for the current tenant. A key set to `null`
   * removes that asset and restores the default image.
   * @returns false when the browser storage refused the data.
   */
  save(changes: Partial<Record<BrandAssetKey, string | null>>): boolean {
    const next: BrandAssets = { ...this.assets() };
    for (const [
      key,
      value
    ] of Object.entries(changes) as [
      BrandAssetKey,
      string | null
    ][]) {
      if (value) {
        next[key] = value;
      } else {
        delete next[key];
      }
    }
    try {
      const all = this.readAll();
      all[this.tenant] = next;
      localStorage.setItem(this.storageKey, JSON.stringify(all));
    } catch {
      return false;
    }
    this.assets.set(next);
    this.applyFavicon();
    return true;
  }

  /**
   * Reads an image file as a data URL after checking its type and size.
   * Rejects with 'type' or 'size' so the caller can explain the problem.
   */
  readImage(file: File): Promise<string> {
    if (!/^image\/(png|jpe?g|svg\+xml|webp|x-icon|vnd\.microsoft\.icon)$/.test(file.type)) {
      return Promise.reject(new Error('type'));
    }
    if (file.size > BRAND_ASSET_MAX_BYTES) {
      return Promise.reject(new Error('size'));
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('read'));
      reader.readAsDataURL(file);
    });
  }

  private get tenant(): string {
    return this.settingsService.tenantIdentifier || 'default';
  }

  private readAll(): Record<string, BrandAssets> {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) ?? {};
    } catch {
      return {};
    }
  }

  private applyFavicon(): void {
    const icons = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
    for (const link of icons) {
      if (!link.dataset['defaultHref']) {
        link.dataset['defaultHref'] = link.getAttribute('href') ?? '';
      }
      link.href = this.assets().favicon ?? link.dataset['defaultHref'];
    }
  }
}
