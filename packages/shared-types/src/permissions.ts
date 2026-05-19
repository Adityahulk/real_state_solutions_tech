/**
 * Single source of truth for every (subject, action) pair the app knows about.
 * The seed pipes this into the Permission table on every deploy; the CASL
 * ability factory consumes the same enums.
 *
 * Conventions:
 *  - subject = entity name (PascalCase) or grouping ("Settings")
 *  - action  = imperative verb (lowercase); "manage" is the wildcard
 */

export const SUBJECTS = [
  'Plot',
  'Site',
  'CADDrawing',
  'Allotment',
  'Transfer',
  'Payment',
  'Document',
  'KycSubmission',
  'Esign',
  'DevelopmentItem',
  'WorkPackage',
  'Vendor',
  'PlotConstruction',
  'ChecklistTemplate',
  'ProgressUpdate',
  'Issue',
  'MediaTask',
  'MediaAsset',
  'ReviewComment',
  'User',
  'Role',
  'AuditLog',
  'Notification',
  'Site.RERAExport',
] as const;

export type Subject = (typeof SUBJECTS)[number];

export const ACTIONS = [
  'manage', // wildcard
  'read',
  'create',
  'update',
  'delete',
  'allot',
  'approve',
  'transfer',
  'publish',
  'assign',
  'impersonate',
  'export',
  'pay',
  'sign',
  'verify',
] as const;

export type Action = (typeof ACTIONS)[number];

export interface PermissionDef {
  subject: Subject;
  action: Action;
  label: string;
  description?: string;
}

/**
 * Helper to type-check inline.
 */
const p = (
  subject: Subject,
  action: Action,
  label: string,
  description?: string,
): PermissionDef => ({ subject, action, label, description });

export const PERMISSION_CATALOGUE: PermissionDef[] = [
  // --- Plot inventory & ownership (Module 1) ---
  p('Plot', 'read', 'View plots', 'Sees plot map + details'),
  p('Plot', 'create', 'Create plot', 'Add a plot (rare; usually CAD-driven)'),
  p('Plot', 'update', 'Edit plot', 'Edit plot metadata (number, area)'),
  p('Plot', 'delete', 'Delete plot'),
  p('Plot', 'allot', 'Allot plot', 'Issue allotment letter and assign owner(s)'),
  p('Plot', 'transfer', 'Initiate transfer', 'Start resale workflow'),

  p('Allotment', 'read', 'View allotments'),
  p('Allotment', 'create', 'Create allotment'),
  p('Allotment', 'update', 'Edit allotment'),
  p('Allotment', 'delete', 'Cancel allotment'),

  p('Transfer', 'read', 'View transfers'),
  p('Transfer', 'create', 'Initiate transfer'),
  p('Transfer', 'approve', 'Approve transfer', 'Admin/Super Admin final approval'),

  p('Payment', 'read', 'View payments'),
  p('Payment', 'create', 'Create payment schedule'),
  p('Payment', 'update', 'Edit payment'),
  p('Payment', 'approve', 'Approve / mark paid'),
  p('Payment', 'pay', 'Initiate payment', 'Owner-side: create payment link, pay an installment'),

  p('Esign', 'sign', 'Sign documents', 'Owner-side: sign allotment/transfer letters'),
  p('Esign', 'read', 'Read e-sign status'),

  p('KycSubmission', 'read', 'View KYC submissions'),
  p('KycSubmission', 'create', 'Submit KYC'),
  p('KycSubmission', 'verify', 'Verify / reject KYC'),

  p('Document', 'read', 'View documents'),
  p('Document', 'create', 'Upload document'),
  p('Document', 'delete', 'Delete document'),

  // --- Site & CAD ---
  p('Site', 'read', 'View site'),
  p('Site', 'create', 'Create site'),
  p('Site', 'update', 'Edit site'),
  p('Site', 'delete', 'Delete site'),
  p('Site.RERAExport', 'export', 'Export RERA report'),

  p('CADDrawing', 'read', 'View CAD drawing'),
  p('CADDrawing', 'create', 'Upload CAD'),
  p('CADDrawing', 'update', 'Re-version CAD'),
  p('CADDrawing', 'delete', 'Delete CAD'),

  // --- Development (Module 2) ---
  p('DevelopmentItem', 'read', 'View dev items'),
  p('DevelopmentItem', 'create', 'Create dev item'),
  p('DevelopmentItem', 'update', 'Update dev item progress'),
  p('DevelopmentItem', 'delete', 'Delete dev item'),

  p('WorkPackage', 'read', 'View work packages'),
  p('WorkPackage', 'create', 'Create work package'),
  p('WorkPackage', 'update', 'Update work package'),
  p('WorkPackage', 'delete', 'Delete work package'),

  p('Vendor', 'read', 'View vendors'),
  p('Vendor', 'create', 'Add vendor'),
  p('Vendor', 'update', 'Edit vendor'),
  p('Vendor', 'delete', 'Delete vendor'),

  // --- Plot construction (Module 3) ---
  p('PlotConstruction', 'read', 'View plot construction'),
  p('PlotConstruction', 'update', 'Update construction checklist'),
  p('PlotConstruction', 'create', 'Bootstrap plot checklist from template'),

  p('ChecklistTemplate', 'read', 'View checklist templates'),
  p('ChecklistTemplate', 'create', 'Create checklist template'),
  p('ChecklistTemplate', 'update', 'Edit checklist template'),
  p('ChecklistTemplate', 'delete', 'Delete checklist template'),

  p('ProgressUpdate', 'read', 'View progress history'),
  p('ProgressUpdate', 'create', 'Record progress update'),

  p('Issue', 'read', 'View issues'),
  p('Issue', 'create', 'Raise an issue'),
  p('Issue', 'update', 'Resolve / update an issue'),

  // --- Marketing (Module 4) ---
  p('MediaTask', 'read', 'View marketing tasks'),
  p('MediaTask', 'create', 'Create marketing task'),
  p('MediaTask', 'update', 'Update marketing task'),
  p('MediaTask', 'assign', 'Assign videographer / editor'),
  p('MediaTask', 'approve', 'Approve final cut'),
  p('MediaTask', 'publish', 'Publish to library'),
  p('MediaTask', 'delete', 'Delete task'),

  p('MediaAsset', 'read', 'View media asset'),
  p('MediaAsset', 'create', 'Upload media asset'),

  p('ReviewComment', 'read', 'View comments'),
  p('ReviewComment', 'create', 'Add comment'),
  p('ReviewComment', 'update', 'Edit own comment'),
  p('ReviewComment', 'delete', 'Delete comment'),

  // --- Identity / RBAC ---
  p('User', 'read', 'View users'),
  p('User', 'create', 'Create user'),
  p('User', 'update', 'Edit user'),
  p('User', 'delete', 'Deactivate user'),
  p('User', 'impersonate', 'Impersonate user'),

  p('Role', 'read', 'View roles'),
  p('Role', 'create', 'Create custom role'),
  p('Role', 'update', 'Edit role permissions'),
  p('Role', 'delete', 'Delete role'),
  p('Role', 'assign', 'Assign role to user'),

  // --- Audit ---
  p('AuditLog', 'read', 'View audit log'),

  // --- Notifications ---
  p('Notification', 'read', 'View own notifications'),
  p('Notification', 'update', 'Update notification prefs'),
];

// --- Built-in role definitions ---

export interface BuiltInRolePermission {
  subject: Subject;
  action: Action;
  /**
   * Optional CASL-style row-level conditions.
   * Variables prefixed with "$user" are substituted at ability-compile time.
   */
  conditions?: Record<string, unknown>;
}

export interface BuiltInRoleDef {
  key: string;
  name: string;
  description?: string;
  isImmutable?: boolean;
  permissions?: BuiltInRolePermission[];
}

export const BUILT_IN_ROLES: BuiltInRoleDef[] = [
  {
    key: 'super_admin',
    name: 'Super Admin',
    description: 'Full unrestricted access. Cannot be edited or deleted.',
    isImmutable: true,
    // No explicit permissions — ability factory short-circuits to "can(everything)".
  },
  {
    key: 'admin',
    name: 'Admin',
    description: 'Manages allotments, transfers, vendors, work packages, payments.',
    permissions: [
      { subject: 'Site', action: 'read' },
      { subject: 'Site', action: 'update' },
      { subject: 'Plot', action: 'read' },
      { subject: 'Plot', action: 'update' },
      { subject: 'Plot', action: 'allot' },
      { subject: 'Plot', action: 'transfer' },
      { subject: 'Allotment', action: 'read' },
      { subject: 'Allotment', action: 'create' },
      { subject: 'Allotment', action: 'update' },
      { subject: 'Transfer', action: 'read' },
      { subject: 'Transfer', action: 'create' },
      { subject: 'Transfer', action: 'approve' },
      { subject: 'Payment', action: 'read' },
      { subject: 'Payment', action: 'create' },
      { subject: 'Payment', action: 'update' },
      { subject: 'Payment', action: 'approve' },
      { subject: 'Document', action: 'read' },
      { subject: 'Document', action: 'create' },
      { subject: 'KycSubmission', action: 'read' },
      { subject: 'KycSubmission', action: 'verify' },
      { subject: 'Esign', action: 'read' },
      { subject: 'CADDrawing', action: 'read' },
      { subject: 'CADDrawing', action: 'create' },
      { subject: 'CADDrawing', action: 'update' },
      { subject: 'DevelopmentItem', action: 'manage' },
      { subject: 'WorkPackage', action: 'manage' },
      { subject: 'Vendor', action: 'manage' },
      { subject: 'PlotConstruction', action: 'manage' },
      { subject: 'ChecklistTemplate', action: 'manage' },
      { subject: 'ProgressUpdate', action: 'read' },
      { subject: 'Issue', action: 'manage' },
      { subject: 'User', action: 'read' },
      { subject: 'AuditLog', action: 'read' },
      { subject: 'Site.RERAExport', action: 'export' },
    ],
  },
  {
    key: 'site_engineer',
    name: 'Site Engineer',
    description: 'Updates on-site progress, uploads photos.',
    permissions: [
      { subject: 'Site', action: 'read' },
      { subject: 'Plot', action: 'read' },
      { subject: 'DevelopmentItem', action: 'read' },
      { subject: 'DevelopmentItem', action: 'update' },
      { subject: 'WorkPackage', action: 'read' },
      {
        subject: 'WorkPackage',
        action: 'update',
        conditions: { assignedEngineerId: '$user.id' },
      },
      { subject: 'PlotConstruction', action: 'read' },
      {
        subject: 'PlotConstruction',
        action: 'update',
        conditions: { assignedEngineerId: '$user.id' },
      },
      { subject: 'ProgressUpdate', action: 'create' },
      { subject: 'ProgressUpdate', action: 'read' },
      { subject: 'Issue', action: 'create' },
      { subject: 'Issue', action: 'read' },
      { subject: 'Issue', action: 'update' },
      { subject: 'Document', action: 'create' }, // for photo proofs
    ],
  },
  {
    key: 'plot_owner',
    name: 'Plot Owner',
    description: 'Sees only their own plot(s).',
    permissions: [
      {
        subject: 'Plot',
        action: 'read',
        conditions: { ownerUserIds: { $contains: '$user.id' } },
      },
      {
        subject: 'Plot',
        action: 'transfer',
        conditions: { ownerUserIds: { $contains: '$user.id' } },
      },
      {
        subject: 'Allotment',
        action: 'read',
        conditions: { ownerUserIds: { $contains: '$user.id' } },
      },
      {
        subject: 'Payment',
        action: 'read',
        conditions: { ownerUserIds: { $contains: '$user.id' } },
      },
      // Document.read for plot_owner — enforced row-level via the
      // ownerUserIds array we attach to the Document subject at request time.
      {
        subject: 'Document',
        action: 'read',
        conditions: { ownerUserIds: { $contains: '$user.id' } },
      },
      {
        subject: 'PlotConstruction',
        action: 'read',
        conditions: { ownerUserIds: { $contains: '$user.id' } },
      },
      {
        subject: 'ProgressUpdate',
        action: 'read',
        conditions: { ownerUserIds: { $contains: '$user.id' } },
      },
      {
        subject: 'Payment',
        action: 'pay',
        conditions: { ownerUserIds: { $contains: '$user.id' } },
      },
      {
        subject: 'Esign',
        action: 'sign',
        conditions: { ownerUserIds: { $contains: '$user.id' } },
      },
      { subject: 'KycSubmission', action: 'create' },
      { subject: 'KycSubmission', action: 'read' },
      { subject: 'Notification', action: 'read' },
      { subject: 'Notification', action: 'update' },
    ],
  },
  {
    key: 'marketing_head',
    name: 'Marketing Head',
    description: 'Owns the marketing pipeline.',
    permissions: [
      { subject: 'Site', action: 'read' },
      { subject: 'Plot', action: 'read' },
      { subject: 'MediaTask', action: 'manage' },
      { subject: 'MediaAsset', action: 'read' },
      { subject: 'ReviewComment', action: 'manage' },
    ],
  },
  {
    key: 'videographer',
    name: 'Videographer',
    description: 'Uploads raw footage for assigned tasks.',
    permissions: [
      {
        subject: 'MediaTask',
        action: 'read',
        conditions: { videographerId: '$user.id' },
      },
      {
        subject: 'MediaTask',
        action: 'update',
        conditions: { videographerId: '$user.id' },
      },
      { subject: 'MediaAsset', action: 'read' },
      { subject: 'MediaAsset', action: 'create' },
      { subject: 'ReviewComment', action: 'read' },
      { subject: 'ReviewComment', action: 'create' },
    ],
  },
  {
    key: 'editor',
    name: 'Editor',
    description: 'Edits and responds to comments for assigned tasks.',
    permissions: [
      {
        subject: 'MediaTask',
        action: 'read',
        conditions: { editorId: '$user.id' },
      },
      {
        subject: 'MediaTask',
        action: 'update',
        conditions: { editorId: '$user.id' },
      },
      { subject: 'MediaAsset', action: 'read' },
      { subject: 'MediaAsset', action: 'create' },
      { subject: 'ReviewComment', action: 'read' },
      { subject: 'ReviewComment', action: 'create' },
    ],
  },
];
