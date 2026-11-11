/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { IconProp } from '@fortawesome/fontawesome-svg-core';

/** A destination inside a sidebar section. */
export interface NavLink {
  /** Translation key of the label. */
  label: string;
  route: string;
  /** Permission code(s); one is enough. Omitted when the link is always visible. */
  permission?: string | string[];
  /** Match the route exactly when deciding the active link. */
  exact?: boolean;
  /** Feature flag name on the component; the link renders only when it is true. */
  flag?: 'cbIldEnabled' | 'mifosRemittanceEnabled';
}

/**
 * A top-level sidebar entry. The visible list mirrors the approved design
 * (Resumen, Clientes, Créditos, Cuentas, Transacciones, Contabilidad, Reportes,
 * Administración); every destination the previous menus offered is kept as a
 * link of one of these sections, shown while the section is active.
 */
export interface NavSection {
  id: string;
  label: string;
  icon: IconProp;
  /** Links of the section; the first permitted one is where the entry navigates. */
  links: NavLink[];
  /** URL patterns that belong to the section, checked in declaration order of sections. */
  match: RegExp[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    label: 'labels.menus.Overview',
    icon: 'chart-pie',
    match: [
      /^\/(home|dashboard|reporting-dashboard|notifications|checker-inbox-and-tasks)(\/|$|\?)/
    ],
    links: [
      { label: 'labels.menus.Dashboard', route: '/dashboard' },
      { label: 'labels.menus.Reporting Dashboard', route: '/reporting-dashboard', flag: 'cbIldEnabled' },
      {
        label: 'labels.menus.Checker Inbox and Tasks',
        route: '/checker-inbox-and-tasks/checker-inbox',
        permission: [
          'ALL_FUNCTIONS_READ',
          'READ_MAKERCHECKER',
          'APPROVE_LOAN',
          'APPROVE_LOAN_CHECKER'
        ]
      },
      { label: 'labels.menus.Notifications', route: '/notifications', permission: 'READ_NOTIFICATION' }
    ]
  },
  {
    id: 'loans',
    label: 'labels.menus.Loans',
    icon: 'hand-holding-usd',
    // Loan accounts live under clients, groups and centers; they still belong to Créditos.
    match: [
      /^\/loans(\/|$|\?)/,
      /\/loans-accounts\//
    ],
    links: [
      { label: 'labels.menus.Loans', route: '/loans', permission: 'READ_LOAN' }
    ]
  },
  {
    id: 'accounts',
    label: 'labels.heading.Accounts',
    icon: 'wallet',
    match: [
      /^\/navigation(\/|$|\?)/,
      /\/(savings|shares|fixed-deposits|recurring-deposits)-accounts\//
    ],
    links: [
      { label: 'labels.menus.Navigation', route: '/navigation', permission: 'READ_CLIENT' }
    ]
  },
  {
    id: 'clients',
    label: 'labels.menus.Clients',
    icon: 'user',
    match: [
      /^\/(clients|groups|centers)(\/|$|\?)/
    ],
    links: [
      { label: 'labels.menus.Clients', route: '/clients', permission: 'READ_CLIENT' },
      { label: 'labels.menus.Groups', route: '/groups', permission: 'READ_GROUP' },
      { label: 'labels.menus.Centers', route: '/centers', permission: 'READ_CENTER' }
    ]
  },
  {
    id: 'transactions',
    label: 'labels.heading.Transactions',
    icon: 'exchange-alt',
    match: [
      /^\/(collections|remittances|account-transfers)(\/|$|\?)/,
      /^\/accounting\/journal-entries(\/|$|\?)/
    ],
    links: [
      {
        label: 'labels.heading.Search Journal Entries',
        route: '/accounting/journal-entries',
        permission: 'READ_JOURNALENTRY',
        exact: true
      },
      {
        label: 'labels.menus.Frequent Postings',
        route: '/accounting/journal-entries/frequent-postings',
        permission: 'CREATE_JOURNALENTRY'
      },
      {
        label: 'labels.menus.Create Journal Entry',
        route: '/accounting/journal-entries/create',
        permission: 'CREATE_JOURNALENTRY'
      },
      {
        label: 'labels.menus.Collection Sheet',
        route: '/collections/collection-sheet',
        permission: 'READ_COLLECTIONSHEET'
      },
      {
        label: 'labels.menus.Individual Collection Sheet',
        route: '/collections/individual-collection-sheet',
        permission: 'READ_COLLECTIONSHEET'
      },
      { label: 'labels.menus.Remittances', route: '/remittances/process', flag: 'mifosRemittanceEnabled' }
    ]
  },
  {
    id: 'accounting',
    label: 'labels.menus.Accounting',
    icon: 'calculator',
    match: [
      /^\/accounting(\/|$|\?)/
    ],
    links: [
      {
        label: 'labels.menus.Accounting',
        route: '/accounting',
        exact: true,
        permission: [
          'READ_JOURNALENTRY',
          'READ_GLACCOUNT',
          'READ_GLCLOSURE',
          'READ_ACCOUNTINGRULE',
          'READ_PROVISIONINGCRITERIA'
        ]
      },
      { label: 'labels.menus.Chart of Accounts', route: '/accounting/chart-of-accounts', permission: 'READ_GLACCOUNT' }
    ]
  },
  {
    id: 'reports',
    label: 'labels.menus.Reports',
    icon: 'chart-bar',
    match: [
      /^\/reports(\/|$|\?)/
    ],
    links: [
      { label: 'labels.menus.Reports', route: '/reports', permission: 'READ_REPORT' }
    ]
  },
  {
    id: 'admin',
    label: 'labels.menus.Admin',
    icon: 'cog',
    match: [
      /^\/(appusers|organization|system|products|templates|users)(\/|$|\?)/
    ],
    links: [
      { label: 'labels.menus.Users', route: '/appusers', permission: 'READ_USER' },
      { label: 'labels.menus.Organization', route: '/organization', permission: 'READ_OFFICE' },
      { label: 'labels.menus.System', route: '/system', permission: 'READ_CONFIGURATION' },
      {
        label: 'labels.menus.Products',
        route: '/products',
        permission: [
          'READ_PRODUCT',
          'READ_LOANPRODUCT',
          'CREATE_LOANPRODUCT',
          'DELETE_LOANPRODUCT'
        ]
      },
      { label: 'labels.menus.Templates', route: '/templates', permission: 'READ_TEMPLATE' }
    ]
  }
];

/** Order the pen shows; matching uses NAV_SECTIONS order (more specific patterns first). */
export const NAV_DISPLAY_ORDER = [
  'overview',
  'clients',
  'loans',
  'accounts',
  'transactions',
  'accounting',
  'reports',
  'admin'
];
