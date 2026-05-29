# Institution Brand Verification Todo

Created: 2026-05-25

Purpose: prevent workspace and slug squatting for school, university, company, and organization brands while still allowing legitimate teachers and organizations to start using Neptino.

Use this as an implementation checklist. When an item is genuinely finished and verified, change `[ ]` to `[x]`.

## Product Policy

- [ ] Define the difference between a workspace name and a verified brand identity.
  - Workspace names are user-entered labels used inside Neptino.
  - Verified brand identity is a stronger claim that the workspace represents a real school, university, company, or organization.
  - The product must not imply that an unverified workspace is officially operated by the named institution.

- [ ] Decide that institution names are not globally unique.
  - Allow duplicate `institutions.name` values because real-world organizations can share similar names.
  - Do not let a user block the real organization by typing a protected name first.
  - Treat the existing unique `slug` as a technical route identifier, not as proof of brand ownership.

- [ ] Define which names require verification before normal public display.
  - Exact matches for famous schools, universities, companies, and public institutions should be high risk.
  - Near matches and confusing variants should be reviewable.
  - Examples: `Harvard`, `Harvard University`, `MIT`, `Oxford University`, `Stanford`, `Google`, `Microsoft`.

- [ ] Define what unverified users are allowed to do.
  - They may create a private workspace.
  - They may configure courses and invite known users.
  - They may not receive a canonical public slug for a protected brand.
  - They may not show a verified badge or official affiliation language.

- [ ] Define the verification evidence Neptino will accept.
  - Official email domain, such as `@harvard.edu`.
  - DNS TXT verification for the organization domain.
  - Manual admin approval.
  - Later: document review for edge cases.

## Database Changes

- [ ] Add verification fields to `public.institutions`.
  - Add `verification_status text not null default 'unverified'`.
  - Recommended values: `unverified`, `pending`, `verified`, `rejected`.
  - Add `verified_at timestamptz`.
  - Add `verified_by uuid references public.users(id)`.
  - Add `claimed_domain text`.
  - Add `public_slug text unique`.
  - Keep existing `slug` as an internal unique slug during the transition.

- [ ] Create `public.protected_institution_names`.
  - Store normalized protected names and reserved slugs.
  - Suggested columns: `id`, `normalized_name`, `canonical_name`, `reserved_slug`, `reserved_domain`, `reason`, `created_at`, `updated_at`.
  - Enable RLS and restrict writes to service/admin paths.
  - Public clients should not be able to modify protected names.

- [ ] Create a name normalization helper.
  - Lowercase names.
  - Trim whitespace.
  - Collapse repeated spaces.
  - Remove punctuation that should not distinguish protected claims.
  - Keep the function deterministic so it can be indexed and tested.

- [ ] Create a protected-name lookup helper.
  - Given a requested institution name, return whether it matches a protected exact name.
  - Later, add fuzzy matching for confusing variants.
  - Keep fuzzy matching out of RLS policies; use it in server-side signup/admin flows.

- [ ] Update institution signup provisioning.
  - If the name is protected, create the workspace with `verification_status = 'pending'`.
  - Do not grant the reserved `public_slug`.
  - Assign a non-authoritative internal slug such as `harvard-unverified-8f3a`.
  - If the name is not protected, create the workspace as `unverified` with a normal generated internal slug.

## Signup And Onboarding UX

- [ ] Update the institution signup copy.
  - Make clear that creating a workspace does not verify brand ownership.
  - Use restrained language such as: `You can start setup now. Some organization names require verification before public use.`

- [ ] Add protected-name pending state to signup.
  - If a requested school or organization name requires verification, show a neutral pending message after account creation.
  - Do not block legitimate users from continuing unless the requested name is clearly abusive.
  - Route the user to admin onboarding with a verification task visible.

- [ ] Add claimed domain field to institution setup.
  - Ask for the official website or email domain.
  - Store as `claimed_domain`.
  - Use this later for DNS or email-domain verification.

- [ ] Add DNS verification instructions.
  - Generate a verification token server-side.
  - Ask the admin to add a TXT record to the claimed domain.
  - Verify the TXT record through a server route or background job.

- [ ] Add official email-domain verification.
  - If the account email domain matches the claimed domain, allow a lower-friction verification path.
  - Keep manual review available for organizations whose admins use external email providers.

## Admin And Internal Review

- [ ] Add an internal review queue.
  - List pending institutions with requested name, claimed domain, creator email, created date, and risk flags.
  - Provide actions: approve, reject, request more information.
  - Record `verified_by` and `verified_at` when approved.

- [ ] Add rejection handling.
  - If rejected, keep the workspace private and mark `verification_status = 'rejected'`.
  - Do not delete user data automatically.
  - Let the user rename the workspace and resubmit if appropriate.

- [ ] Add reserved-slug assignment on approval.
  - When approved, assign `public_slug` to the reserved canonical slug if available.
  - If a prior unverified workspace used a confusing slug, keep it on an internal slug and do not expose it publicly.

- [ ] Add a manual override policy.
  - Super admins need a controlled way to reassign `public_slug` and verification status.
  - Log every override with actor, reason, old values, and new values.

## Public Display Rules

- [ ] Gate verified labels and badges.
  - Only show verified/official institution markers when `verification_status = 'verified'`.
  - Unverified workspaces should display as normal private workspaces, not official brands.

- [ ] Gate public institution pages.
  - Do not publish public institution profile pages for protected names unless verified.
  - If public pages exist before verification, use internal slugs and avoid SEO-indexable official-brand claims.

- [ ] Gate canonical slugs.
  - Do not route `/harvard` or similar canonical slugs to an unverified workspace.
  - Route canonical protected slugs only after verification.

## Abuse And Dispute Handling

- [ ] Add an institution claim/dispute path.
  - Allow a verified representative to request review of an existing workspace using their brand.
  - Collect claimant name, role, official email, claimed domain, and notes.
  - Do not expose whether a workspace owner is a Neptino user beyond what is already public.

- [ ] Add a takedown/escalation policy.
  - Define what happens for impersonation, phishing, or fraudulent use.
  - Serious misuse should suspend public visibility while preserving audit data.
  - Keep this operationally separate from ordinary duplicate-name cases.

- [ ] Add audit logging.
  - Log verification status changes.
  - Log slug/public slug changes.
  - Log protected-name matches at signup.
  - Include actor, timestamp, institution id, and reason.

## Tests

- [ ] Add unit tests for name normalization.
  - Case insensitivity.
  - Whitespace normalization.
  - Punctuation normalization.
  - Known protected-name matches.

- [ ] Add database migration tests or local verification SQL checks.
  - Protected name creates pending institution.
  - Unprotected name creates unverified institution.
  - Canonical public slug is not assigned to pending institutions.
  - Verified institution can receive reserved public slug.

- [ ] Add signup flow tests.
  - Institution signup with an unprotected name works normally.
  - Institution signup with a protected name creates a pending workspace.
  - Independent teacher signup is not blocked by protected institution-name rules unless they intentionally claim a protected workspace name.

- [ ] Add admin review tests.
  - Approving verification sets `verification_status`, `verified_at`, and `verified_by`.
  - Rejecting verification preserves workspace data.
  - Public slug assignment is unique and cannot be claimed by an unverified workspace.

## Rollout

- [ ] Seed an initial protected-name list.
  - Start small with obvious high-risk institutions.
  - Include canonical name, normalized name, reserved slug, and official domain.
  - Avoid over-blocking ordinary names in the first pass.

- [ ] Backfill existing institutions.
  - Mark existing institution rows as `unverified` unless clearly trusted.
  - Identify names that match the protected list.
  - Move matched rows to `pending` unless already manually known to be legitimate.

- [ ] Document the user-facing policy.
  - Explain that Neptino protects organization names from impersonation.
  - Explain how a legitimate organization can verify control.
  - Avoid legal-heavy wording in normal UI; keep the fuller policy in help/admin docs.

- [ ] Add post-release monitoring.
  - Track protected-name signup attempts.
  - Track verification approval/rejection rates.
  - Track support requests related to institution names and slugs.
