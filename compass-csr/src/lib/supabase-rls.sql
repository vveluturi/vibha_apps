-- Row Level Security policies for Compass CSR.
-- Reference only — these are not executed by the app. Run them manually in
-- the Supabase SQL editor (Project → SQL Editor) against the target project.

-- Phase 2: programs.notes column (verified missing against the live project
-- on 2026-07-17 — program-dashboard.tsx's notes migration reads/writes this
-- column and falls back to localStorage until it exists).
alter table programs add column if not exists notes jsonb default '[]'::jsonb;

-- Allow users to read their own company
create policy "Users can view their own company"
on companies for select
using (id = (select company_id from user_profiles where id = auth.uid()));

-- Allow users to read profiles in their company
create policy "Users can view profiles in their company"
on user_profiles for select
using (company_id = (select company_id from user_profiles where id = auth.uid()));

-- Allow users to read their company's programs
create policy "Users can view their company programs"
on programs for select
using (company_id = (select company_id from user_profiles where id = auth.uid()));

-- Allow admins to insert programs
create policy "Admins can create programs"
on programs for insert
with check (
  company_id = (select company_id from user_profiles where id = auth.uid())
  and (select role from user_profiles where id = auth.uid()) = 'admin'
);

-- Allow anyone in the company to read invites for their company
create policy "Users can view their company invites"
on invites for select
using (company_id = (select company_id from user_profiles where id = auth.uid()));

-- Allow admins to create invites
create policy "Admins can create invites"
on invites for insert
with check (
  company_id = (select company_id from user_profiles where id = auth.uid())
  and (select role from user_profiles where id = auth.uid()) = 'admin'
);

-- Allow public to read invites by token (for signup flow)
create policy "Public can read invites by token"
on invites for select
using (true);

-- Allow public to update invite accepted status
create policy "Public can accept invites"
on invites for update
using (true);

-- ─── Phase 2: tasks, partnerships, activity_logs, task_suggestions ─────────

-- Helper used by the policies below — resolves the calling user's company_id
-- once, security definer so it can read user_profiles regardless of that
-- table's own RLS policies.
create or replace function get_my_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from user_profiles where id = auth.uid();
$$;

-- Tasks policies
CREATE POLICY "Users can view company tasks"
ON tasks FOR SELECT
USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert company tasks"
ON tasks FOR INSERT
WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update company tasks"
ON tasks FOR UPDATE
USING (company_id = get_my_company_id());

CREATE POLICY "Users can delete company tasks"
ON tasks FOR DELETE
USING (company_id = get_my_company_id());

-- Partnerships policies
CREATE POLICY "Users can view company partnerships"
ON partnerships FOR SELECT
USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert company partnerships"
ON partnerships FOR INSERT
WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update company partnerships"
ON partnerships FOR UPDATE
USING (company_id = get_my_company_id());

-- Activity logs policies
CREATE POLICY "Users can view company activity logs"
ON activity_logs FOR SELECT
USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert company activity logs"
ON activity_logs FOR INSERT
WITH CHECK (company_id = get_my_company_id());

-- Task suggestions policies
CREATE POLICY "Users can view company task suggestions"
ON task_suggestions FOR SELECT
USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert task suggestions"
ON task_suggestions FOR INSERT
WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update task suggestions"
ON task_suggestions FOR UPDATE
USING (company_id = get_my_company_id());
