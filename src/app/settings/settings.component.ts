/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';

/** Custom Services */
import { ContactInfo, SettingsService } from './settings.service';
import { AlertService } from 'app/core/alert/alert.service';
import { TranslateService } from '@ngx-translate/core';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle
} from '@angular/material/expansion';
import { FileUploadComponent } from '../shared/file-upload/file-upload.component';
import { LanguageSelectorComponent } from '../shared/language-selector/language-selector.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { UiThemeService } from 'app/shared/ui-theme/ui-theme.service';
import { BRAND_ASSET_ACCEPT, BrandAssetKey, BrandAssetsService } from 'app/shared/ui-theme/brand-assets.service';

/**
 * Settings component.
 */
@Component({
  selector: 'mifosx-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    FileUploadComponent,
    LanguageSelectorComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private alertService = inject(AlertService);
  private translateService = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private brandAssets = inject(BrandAssetsService);

  /** Predesigned palettes; picking one applies it immediately. */
  readonly uiThemes = inject(UiThemeService);

  hasChanges = false;

  /** Brand images the user can replace, in display order. */
  readonly brandAssetFields: { key: BrandAssetKey; label: string }[] = [
    { key: 'logo', label: 'labels.inputs.Logo' },
    { key: 'logoWithName', label: 'labels.inputs.Logo with Organization Name' },
    { key: 'favicon', label: 'labels.inputs.Favicon' },
    { key: 'cover', label: 'labels.inputs.Cover Image' }
  ];
  readonly brandAssetAccept = BRAND_ASSET_ACCEPT;
  /** Picked but not yet saved images; `null` marks a removal. */
  pendingAssets: Partial<Record<BrandAssetKey, string | null>> = {};
  /** Translation key of the last validation problem per image. */
  assetErrors: Partial<Record<BrandAssetKey, string>> = {};

  /** Date formats. */
  dateFormats: string[] = [
    'dd MMMM yyyy',
    'dd/MM/yyyy',
    'dd/MMMM/yyyy',
    'dd-MM-yyyy',
    'dd-MMMM-yyyy',
    'dd-MM-yy',
    'MM/dd/yyyy',
    'MMMM-dd-yyyy',
    'MMMM dd yyyy',
    'MMMM/dd/yyyy',
    'MM-dd-yy',
    'yyyy-MM-dd'
  ];
  datetimeFormats: string[] = [
    // All date formats with HH:mm:ss (seconds)
    'dd MMMM yyyy HH:mm:ss',
    'dd/MMMM/yyyy HH:mm:ss',
    'dd-MMMM-yyyy HH:mm:ss',
    'dd-MM-yy HH:mm:ss',
    'MMMM-dd-yyyy HH:mm:ss',
    'MMMM dd yyyy HH:mm:ss',
    'MMMM/dd/yyyy HH:mm:ss',
    'MM-dd-yy HH:mm:ss',
    'yyyy-MM-dd HH:mm:ss',
    // All date formats with HH:mm (no seconds)
    'dd MMMM yyyy HH:mm',
    'dd/MMMM/yyyy HH:mm',
    'dd-MMMM-yyyy HH:mm',
    'dd-MM-yy HH:mm',
    'MMMM-dd-yyyy HH:mm',
    'MMMM dd yyyy HH:mm',
    'MMMM/dd/yyyy HH:mm',
    'MM-dd-yy HH:mm',
    'yyyy-MM-dd HH:mm'
  ];
  /** Decimals. */
  decimals: string[] = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8'
  ];
  /** Date Format Setting */
  dateFormat = new FormControl('');
  /** Datetime Format Setting */
  datetimeFormat = new FormControl('');
  /** Decimals to Display Setting */
  decimalsToDisplay = new FormControl('');
  /** Contact Information */
  website = new FormControl('', Validators.pattern(/^https?:\/\/\S+$/i));
  email = new FormControl('', Validators.email);
  phone = new FormControl('', Validators.pattern(/^[+\d\s()-]*$/));

  private initialValues: {
    dateFormat: string;
    datetimeFormat: string;
    decimals: string;
    contact: ContactInfo;
  };

  ngOnInit() {
    this.initialValues = {
      dateFormat: this.settingsService.dateFormat,
      datetimeFormat: this.settingsService.datetimeFormat,
      decimals: this.settingsService.decimals,
      contact: this.settingsService.contactInfo
    };
    this.website.patchValue(this.initialValues.contact.website, { emitEvent: false });
    this.email.patchValue(this.initialValues.contact.email, { emitEvent: false });
    this.phone.patchValue(this.initialValues.contact.phone, { emitEvent: false });
    this.dateFormat.patchValue(this.initialValues.dateFormat, { emitEvent: false });
    this.datetimeFormat.patchValue(this.initialValues.datetimeFormat, { emitEvent: false });
    this.decimalsToDisplay.patchValue(this.initialValues.decimals, { emitEvent: false });
    this.trackChanges();
  }

  trackChanges(): void {
    merge(
      this.dateFormat.valueChanges,
      this.datetimeFormat.valueChanges,
      this.decimalsToDisplay.valueChanges,
      this.website.valueChanges,
      this.email.valueChanges,
      this.phone.valueChanges
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.hasChanges = this.hasFormChanged();
        // OnPush: a selection made in the select overlay does not mark this view.
        this.cdr.markForCheck();
      });
  }

  /** The image to preview: the pending one if any, else the saved one. */
  assetPreview(key: BrandAssetKey): string | null {
    if (key in this.pendingAssets) {
      return this.pendingAssets[key] ?? null;
    }
    return this.brandAssets.assets()[key] ?? null;
  }

  onBrandAssetSelected(key: BrandAssetKey, file: File): void {
    this.brandAssets
      .readImage(file)
      .then((dataUrl) => {
        this.pendingAssets = { ...this.pendingAssets, [key]: dataUrl };
        this.assetErrors = { ...this.assetErrors, [key]: undefined };
      })
      .catch((error: Error) => {
        this.assetErrors = {
          ...this.assetErrors,
          [key]:
            error.message === 'size'
              ? 'labels.text.Image exceeds 512 KB'
              : 'labels.text.Select a PNG, JPG, SVG, WEBP or ICO image'
        };
      })
      .finally(() => {
        this.hasChanges = this.hasFormChanged();
        this.cdr.markForCheck();
      });
  }

  removeBrandAsset(key: BrandAssetKey): void {
    this.pendingAssets = { ...this.pendingAssets, [key]: null };
    this.hasChanges = this.hasFormChanged();
  }

  /** Whether the contact fields hold values that can be saved. */
  get contactValid(): boolean {
    return this.website.valid && this.email.valid && this.phone.valid;
  }

  private get contactValue(): ContactInfo {
    return {
      website: (this.website.value ?? '').trim(),
      email: (this.email.value ?? '').trim(),
      phone: (this.phone.value ?? '').trim()
    };
  }

  private hasFormChanged(): boolean {
    const contact = this.contactValue;
    const initialContact = this.initialValues.contact;
    return (
      Object.keys(this.pendingAssets).length > 0 ||
      contact.website !== initialContact.website ||
      contact.email !== initialContact.email ||
      contact.phone !== initialContact.phone ||
      (this.dateFormat.value ?? '') !== this.initialValues.dateFormat ||
      (this.datetimeFormat.value ?? '') !== this.initialValues.datetimeFormat ||
      (this.decimalsToDisplay.value ?? '') !== this.initialValues.decimals
    );
  }

  submit(): void {
    if (!this.contactValid) {
      return;
    }
    if (Object.keys(this.pendingAssets).length > 0 && !this.brandAssets.save(this.pendingAssets)) {
      this.alertService.alert({
        type: 'Settings Update',
        message: this.translateService.instant('labels.text.Brand images could not be stored')
      });
      return;
    }
    this.pendingAssets = {};
    this.settingsService.setDateFormat(this.dateFormat.value ?? this.initialValues.dateFormat);
    this.settingsService.setDatetimeFormat(this.datetimeFormat.value ?? this.initialValues.datetimeFormat);
    this.settingsService.setDecimalToDisplay(this.decimalsToDisplay.value ?? this.initialValues.decimals);
    this.settingsService.setContactInfo(this.contactValue);
    this.initialValues = {
      dateFormat: this.dateFormat.value ?? '',
      datetimeFormat: this.datetimeFormat.value ?? '',
      decimals: this.decimalsToDisplay.value ?? '',
      contact: this.contactValue
    };
    this.hasChanges = false;
    this.alertService.alert({
      type: 'Settings Update',
      message: this.translateService.instant('labels.text.Settings saved successfully')
    });
  }
}
