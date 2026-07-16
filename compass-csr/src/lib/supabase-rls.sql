-- Row Level Security policies for Compass CSR.
-- Reference only — these are not executed by the app. Run them manually in
-- the Supabase SQL editor (Project → SQL Editor) against the target project.

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
