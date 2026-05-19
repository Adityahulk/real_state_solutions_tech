import { z } from 'zod';

// --- Auth ---

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

// --- Users ---

export const createUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(120),
  phone: z.string().optional(),
  password: z.string().min(8).max(128),
  roleIds: z.array(z.string().uuid()).default([]),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// --- Roles ---

export const rolePermissionInputSchema = z.object({
  subject: z.string(),
  action: z.string(),
  conditions: z.record(z.unknown()).nullable().optional(),
});

export const createRoleSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_]+$/, 'lowercase letters, digits, underscores only'),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  permissions: z.array(rolePermissionInputSchema).default([]),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  permissions: z.array(rolePermissionInputSchema).optional(),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  scope: z.record(z.unknown()).nullable().optional(),
});
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

// --- Sites ---

export const createSiteSchema = z.object({
  name: z.string().min(1).max(200),
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i, 'Letters, digits, hyphen, underscore only'),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  reraNumber: z.string().max(120).optional(),
});
export type CreateSiteInput = z.infer<typeof createSiteSchema>;

// --- CAD ---

export const presignUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

export const completeCadUploadSchema = z.object({
  siteId: z.string().uuid(),
  storageKey: z.string().min(1),
  filename: z.string().min(1),
});
export type CompleteCadUploadInput = z.infer<typeof completeCadUploadSchema>;

export const cadReviewItemSchema = z.object({
  layer: z.string(),
  /** Label parsed from the CAD (e.g. plot number); admin may edit. */
  label: z.string(),
  /** "plot" | "dev_item" — defaults to whatever the parser guessed */
  kind: z.enum(['plot', 'dev_item']),
  /** "skip" if the admin wants the row dropped */
  action: z.enum(['accept', 'skip']),
  /** for dev_items only */
  devKind: z.string().optional(),
  /** GeoJSON Polygon or Point */
  geometry: z.unknown(),
  /** Optional area override (sqft) for plots */
  areaSqft: z.number().nullable().optional(),
});

export const cadActivateSchema = z.object({
  items: z.array(cadReviewItemSchema),
});
export type CadActivateInput = z.infer<typeof cadActivateSchema>;

// --- Allotments ---

export const ownerShareSchema = z
  .object({
    /** either personId OR companyId OR new person inline */
    personId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
    newPerson: z
      .object({
        fullName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        panMasked: z.string().optional(),
        aadhaarLast4: z.string().regex(/^\d{4}$/).optional(),
        addressLine1: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
      })
      .optional(),
    sharePercent: z.number().min(0.01).max(100),
    nomineeName: z.string().optional(),
    nomineeRelation: z.string().optional(),
  })
  .refine(
    (v) => Boolean(v.personId) || Boolean(v.companyId) || Boolean(v.newPerson),
    { message: 'Provide personId, companyId, or newPerson' },
  );

export const createAllotmentSchema = z
  .object({
    plotId: z.string().uuid(),
    salePrice: z.number().positive(),
    shares: z.array(ownerShareSchema).min(1).max(8),
  })
  .refine(
    (v) =>
      Math.abs(v.shares.reduce((sum, s) => sum + s.sharePercent, 0) - 100) < 0.01,
    { message: 'Shares must total 100%' },
  );
export type CreateAllotmentInput = z.infer<typeof createAllotmentSchema>;

// --- Transfers ---

export const initiateTransferSchema = z
  .object({
    plotId: z.string().uuid(),
    salePrice: z.number().positive(),
    newShares: z.array(ownerShareSchema).min(1).max(8),
  })
  .refine(
    (v) =>
      Math.abs(v.newShares.reduce((sum, s) => sum + s.sharePercent, 0) - 100) < 0.01,
    { message: 'New shares must total 100%' },
  );
export type InitiateTransferInput = z.infer<typeof initiateTransferSchema>;

export const approveTransferSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
});
export type ApproveTransferInput = z.infer<typeof approveTransferSchema>;

// --- Payments ---

export const paymentTemplateSchema = z.enum([
  'standard_4',
  'standard_6',
  'construction_linked',
]);
export type PaymentTemplate = z.infer<typeof paymentTemplateSchema>;

export const createScheduleSchema = z.object({
  allotmentId: z.string().uuid(),
  template: paymentTemplateSchema,
  /** start date for first installment; subsequent dates derived */
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;

export const payInstallmentSchema = z.object({
  installmentId: z.string().uuid(),
});
export type PayInstallmentInput = z.infer<typeof payInstallmentSchema>;

export const markPaidSchema = z.object({
  installmentId: z.string().uuid(),
  /** offline payment ref (cheque no., NEFT UTR, etc.) */
  reference: z.string().max(120).optional(),
});
export type MarkPaidInput = z.infer<typeof markPaidSchema>;

// --- E-sign ---

export const requestEsignSchema = z.object({
  documentId: z.string().uuid(),
  signers: z
    .array(
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum(['builder', 'buyer', 'seller']),
      }),
    )
    .min(1)
    .max(8),
});
export type RequestEsignInput = z.infer<typeof requestEsignSchema>;

// --- KYC ---

export const submitKycSchema = z.object({
  personId: z.string().uuid(),
  /** Full PAN; server stores only sha256(pan) and a masked form */
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN').optional(),
  /** Last 4 of Aadhaar; full Aadhaar is never sent to the server */
  aadhaarLast4: z.string().regex(/^\d{4}$/).optional(),
  panDocKey: z.string().optional(),
  aadhaarDocKey: z.string().optional(),
  addressDocKey: z.string().optional(),
});
export type SubmitKycInput = z.infer<typeof submitKycSchema>;

export const verifyKycSchema = z.object({
  decision: z.enum(['verify', 'reject']),
  reason: z.string().max(500).optional(),
});
export type VerifyKycInput = z.infer<typeof verifyKycSchema>;

// --- Vendors ---

export const createVendorSchema = z.object({
  name: z.string().min(1).max(200),
  gstin: z.string().max(20).optional(),
  pan: z.string().max(20).optional(),
  contactName: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional(),
  scope: z.string().max(500).optional(),
});
export type CreateVendorInput = z.infer<typeof createVendorSchema>;

// --- Development items + work packages ---

export const createDevItemSchema = z.object({
  siteId: z.string().uuid(),
  kind: z.string().min(1).max(60),
  label: z.string().min(1).max(200),
  geometry: z.unknown().optional(),
  deadline: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});
export type CreateDevItemInput = z.infer<typeof createDevItemSchema>;

export const updateDevItemSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']).optional(),
  deadline: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .nullable()
    .optional(),
});
export type UpdateDevItemInput = z.infer<typeof updateDevItemSchema>;

export const createWorkPackageSchema = z
  .object({
    devItemId: z.string().uuid().optional(),
    plotId: z.string().uuid().optional(),
    name: z.string().min(1).max(200),
    vendorId: z.string().uuid().nullable().optional(),
    assignedEngineerId: z.string().uuid().nullable().optional(),
    budget: z.number().nonnegative().optional(),
    deadline: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
      .optional(),
  })
  .refine((v) => Boolean(v.devItemId) || Boolean(v.plotId), {
    message: 'Provide devItemId or plotId',
  });
export type CreateWorkPackageInput = z.infer<typeof createWorkPackageSchema>;

export const updateWorkPackageSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  vendorId: z.string().uuid().nullable().optional(),
  assignedEngineerId: z.string().uuid().nullable().optional(),
  budget: z.number().nonnegative().nullable().optional(),
  deadline: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .nullable()
    .optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']).optional(),
});
export type UpdateWorkPackageInput = z.infer<typeof updateWorkPackageSchema>;

// --- Progress updates ---

export const createProgressUpdateSchema = z
  .object({
    workPackageId: z.string().uuid().optional(),
    plotChecklistItemId: z.string().uuid().optional(),
    percentAfter: z.number().min(0).max(100),
    note: z.string().max(1000).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    photoDocIds: z.array(z.string().uuid()).default([]),
    /** Engineer-side capture timestamp. Server defaults to now if omitted. */
    capturedAt: z.string().datetime().optional(),
  })
  .refine((v) => Boolean(v.workPackageId) || Boolean(v.plotChecklistItemId), {
    message: 'Provide workPackageId or plotChecklistItemId',
  });
export type CreateProgressUpdateInput = z.infer<typeof createProgressUpdateSchema>;

// --- Issues ---

export const createIssueSchema = z
  .object({
    workPackageId: z.string().uuid().optional(),
    plotChecklistItemId: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    body: z.string().max(2000).optional(),
    severity: z.enum(['low', 'normal', 'high', 'blocker']).default('normal'),
    photoDocIds: z.array(z.string().uuid()).default([]),
  })
  .refine((v) => Boolean(v.workPackageId) || Boolean(v.plotChecklistItemId), {
    message: 'Provide workPackageId or plotChecklistItemId',
  });
export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export const resolveIssueSchema = z.object({
  status: z.enum(['RESOLVED', 'WONT_FIX', 'OPEN']),
  resolutionNote: z.string().max(1000).optional(),
});
export type ResolveIssueInput = z.infer<typeof resolveIssueSchema>;

// --- Checklist templates ---

export const checklistTemplateItemSchema = z.object({
  group: z.string().min(1).max(40),
  label: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  position: z.number().int().nonnegative().default(0),
});

export const createChecklistTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
  items: z.array(checklistTemplateItemSchema).max(500).default([]),
});
export type CreateChecklistTemplateInput = z.infer<typeof createChecklistTemplateSchema>;

export const updateChecklistTemplateSchema = createChecklistTemplateSchema.partial();
export type UpdateChecklistTemplateInput = z.infer<typeof updateChecklistTemplateSchema>;

export const bootstrapPlotChecklistSchema = z.object({
  plotId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
});
export type BootstrapPlotChecklistInput = z.infer<typeof bootstrapPlotChecklistSchema>;

// --- Photo upload presign ---

export const photoPresignSchema = z.object({
  /** logical scope for the key prefix */
  scope: z.enum(['progress', 'issue']),
  /** id of the work package / checklist item being photographed */
  parentId: z.string().uuid(),
  filename: z.string().min(1),
  contentType: z.string().min(1),
});
export type PhotoPresignInput = z.infer<typeof photoPresignSchema>;

export const registerPhotoSchema = z.object({
  storageKey: z.string().min(1),
  mimeType: z.string().min(1),
  /** Parent entity for the Document row */
  scope: z.enum(['progress', 'issue']),
  parentId: z.string().uuid(),
});
export type RegisterPhotoInput = z.infer<typeof registerPhotoSchema>;

// --- Marketing (Module 4) ---

export const createMediaTaskSchema = z
  .object({
    title: z.string().min(1).max(200),
    brief: z.string().max(2000).optional(),
    siteId: z.string().uuid().optional(),
    plotId: z.string().uuid().optional(),
    videographerId: z.string().uuid().optional(),
    editorId: z.string().uuid().optional(),
    deadline: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
      .optional(),
  })
  .refine((v) => Boolean(v.siteId) || Boolean(v.plotId), {
    message: 'Provide siteId or plotId',
  });
export type CreateMediaTaskInput = z.infer<typeof createMediaTaskSchema>;

export const assignMediaTaskSchema = z.object({
  videographerId: z.string().uuid().nullable().optional(),
  editorId: z.string().uuid().nullable().optional(),
});
export type AssignMediaTaskInput = z.infer<typeof assignMediaTaskSchema>;

export const createMediaUploadSchema = z.object({
  taskId: z.string().uuid(),
  kind: z.enum(['raw', 'edit', 'final']),
  filename: z.string().min(1),
  contentType: z.string().min(1),
});
export type CreateMediaUploadInput = z.infer<typeof createMediaUploadSchema>;

export const finishMediaUploadSchema = z.object({
  taskId: z.string().uuid(),
  kind: z.enum(['raw', 'edit', 'final']),
  muxUploadId: z.string().optional(),
  storageKey: z.string().optional(),
});
export type FinishMediaUploadInput = z.infer<typeof finishMediaUploadSchema>;

export const reviewCommentSchema = z.object({
  taskId: z.string().uuid(),
  assetId: z.string().uuid().optional(),
  body: z.string().min(1).max(2000),
  timestampSec: z.number().min(0).max(36_000).optional(),
});
export type ReviewCommentInput = z.infer<typeof reviewCommentSchema>;

export const mediaTaskDecisionSchema = z.object({
  decision: z.enum(['approve', 'revise', 'publish']),
  note: z.string().max(1000).optional(),
});
export type MediaTaskDecisionInput = z.infer<typeof mediaTaskDecisionSchema>;

// --- RERA quarterly export ---

export const reraQuerySchema = z.object({
  siteId: z.string().uuid(),
  year: z.coerce.number().int().min(2020).max(2099),
  /** 1..4 for Q1..Q4 */
  quarter: z.coerce.number().int().min(1).max(4),
});
export type ReraQueryInput = z.infer<typeof reraQuerySchema>;
