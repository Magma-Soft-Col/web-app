/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { NgStyle } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * Custom file upload component based on angular material.
 */
@Component({
  selector: 'mifosx-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    NgStyle,
    FaIconComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileUploadComponent implements OnInit {
  /** Form field flex dimension */
  @Input() flex: any;
  @Input() acceptFilter: string;
  /** Emits the file the user picked, so the host can read or upload it. */
  @Output() fileSelected = new EventEmitter<File>();

  /** Selected file name */
  fileName: string;

  constructor() {}

  ngOnInit() {
    if (!this.acceptFilter) {
      this.acceptFilter = '.xls,.xlsx,.pdf,.doc,.docx,.png,.jpeg,.jpg';
    }
  }

  /**
   * Sets the file name.
   * @param {any} event File input change event.
   */
  onFileSelect($event: any) {
    const file: File | undefined = $event.target.files?.[0];
    if (!file) {
      return;
    }
    this.fileName = file.name;
    this.fileSelected.emit(file);
    // Allow picking the same file again after the host rejects or clears it.
    $event.target.value = '';
  }
}
