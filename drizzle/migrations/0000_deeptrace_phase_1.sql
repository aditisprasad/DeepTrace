CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TYPE public.app_role AS ENUM ('admin', 'lead_analyst', 'analyst', 'viewer');

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My investigation workspace',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'analyst',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'review', 'resolved', 'archived')),
  priority SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL,
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, case_code),
  UNIQUE (id, organization_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.case_members (
  case_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, user_id),
  FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, DELETE ON public.case_members TO authenticated;
GRANT ALL ON public.case_members TO service_role;
ALTER TABLE public.case_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  evidence_code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('url', 'domain', 'ip', 'email', 'email_header', 'screenshot', 'file', 'hash', 'phone', 'other')),
  source TEXT NOT NULL DEFAULT 'Investigator submission',
  value TEXT NOT NULL DEFAULT '',
  original_name TEXT,
  content_type TEXT,
  size_bytes BIGINT,
  storage_path TEXT,
  sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'collected' CHECK (status IN ('collected', 'queued', 'needs_review', 'error')),
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  analyst_notes TEXT NOT NULL DEFAULT '',
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE,
  UNIQUE (organization_id, evidence_code),
  UNIQUE (id, organization_id, case_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence TO authenticated;
GRANT ALL ON public.evidence TO service_role;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.evidence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  evidence_id UUID NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'submission',
  source_uri TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (evidence_id, organization_id, case_id) REFERENCES public.evidence(id, organization_id, case_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_sources TO authenticated;
GRANT ALL ON public.evidence_sources TO service_role;
ALTER TABLE public.evidence_sources ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('domain', 'ip', 'certificate', 'email', 'url', 'organization', 'file', 'phone', 'campaign', 'hash')),
  value TEXT NOT NULL,
  first_observed TIMESTAMPTZ,
  last_observed TIMESTAMPTZ,
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE,
  UNIQUE (id, organization_id, case_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entities TO authenticated;
GRANT ALL ON public.entities TO service_role;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.entity_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  entity_id UUID NOT NULL,
  evidence_id UUID,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (entity_id, organization_id, case_id) REFERENCES public.entities(id, organization_id, case_id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_id, organization_id, case_id) REFERENCES public.evidence(id, organization_id, case_id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_observations TO authenticated;
GRANT ALL ON public.entity_observations TO service_role;
ALTER TABLE public.entity_observations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  source_entity_id UUID NOT NULL,
  target_entity_id UUID NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'related_to',
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  rationale TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (source_entity_id, organization_id, case_id) REFERENCES public.entities(id, organization_id, case_id) ON DELETE CASCADE,
  FOREIGN KEY (target_entity_id, organization_id, case_id) REFERENCES public.entities(id, organization_id, case_id) ON DELETE CASCADE,
  CHECK (source_entity_id <> target_entity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relationships TO authenticated;
GRANT ALL ON public.relationships TO service_role;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'suspected' CHECK (status IN ('suspected', 'under_investigation', 'confirmed', 'dismissed')),
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  first_observed TIMESTAMPTZ,
  last_observed TIMESTAMPTZ,
  risk_level TEXT NOT NULL DEFAULT 'unassessed' CHECK (risk_level IN ('unassessed', 'low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.campaign_entities (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, entity_id),
  FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id, organization_id, case_id) REFERENCES public.entities(id, organization_id, case_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_entities TO authenticated;
GRANT ALL ON public.campaign_entities TO service_role;
ALTER TABLE public.campaign_entities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  entity_id UUID,
  evidence_id UUID,
  description TEXT NOT NULL DEFAULT '',
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id, organization_id, case_id) REFERENCES public.entities(id, organization_id, case_id) ON DELETE SET NULL,
  FOREIGN KEY (evidence_id, organization_id, case_id) REFERENCES public.evidence(id, organization_id, case_id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timeline_events TO authenticated;
GRANT ALL ON public.timeline_events TO service_role;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  finding_code TEXT NOT NULL,
  title TEXT NOT NULL,
  assessment TEXT NOT NULL DEFAULT '',
  executive_summary TEXT NOT NULL DEFAULT '',
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'rejected')),
  limitations TEXT NOT NULL DEFAULT '',
  recommended_next_steps TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE,
  UNIQUE (organization_id, finding_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.findings TO authenticated;
GRANT ALL ON public.findings TO service_role;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.finding_evidence (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  finding_id UUID NOT NULL REFERENCES public.findings(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (finding_id, evidence_id),
  FOREIGN KEY (evidence_id, organization_id, case_id) REFERENCES public.evidence(id, organization_id, case_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finding_evidence TO authenticated;
GRANT ALL ON public.finding_evidence TO service_role;
ALTER TABLE public.finding_evidence ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.attack_techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  technique_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tactic TEXT NOT NULL DEFAULT '',
  observed_behavior TEXT NOT NULL DEFAULT '',
  evidence_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_id, organization_id, case_id) REFERENCES public.evidence(id, organization_id, case_id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attack_techniques TO authenticated;
GRANT ALL ON public.attack_techniques TO service_role;
ALTER TABLE public.attack_techniques ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID,
  actor_id UUID,
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (case_id, organization_id) REFERENCES public.cases(id, organization_id) ON DELETE SET NULL
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX user_roles_user_id_idx ON public.user_roles (user_id);
CREATE INDEX cases_org_updated_idx ON public.cases (organization_id, updated_at DESC);
CREATE INDEX case_members_user_id_idx ON public.case_members (user_id, case_id);
CREATE INDEX evidence_case_collected_idx ON public.evidence (case_id, collected_at DESC);
CREATE INDEX entities_case_type_idx ON public.entities (case_id, entity_type);
CREATE INDEX relationships_case_idx ON public.relationships (case_id);
CREATE INDEX campaigns_case_idx ON public.campaigns (case_id);
CREATE INDEX timeline_case_occurred_idx ON public.timeline_events (case_id, occurred_at DESC);
CREATE INDEX findings_case_updated_idx ON public.findings (case_id, updated_at DESC);
CREATE INDEX audit_logs_org_created_idx ON public.audit_logs (organization_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _organization_id UUID, _roles public.app_role[] DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.organization_id = _organization_id
      AND (_roles IS NULL OR ur.role = ANY(_roles))
  );
$$;
REVOKE ALL ON FUNCTION public.has_org_role(UUID, UUID, public.app_role[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_org_role(UUID, UUID, public.app_role[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_access_case(_user_id UUID, _case_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = _case_id
      AND (
        public.has_org_role(_user_id, c.organization_id, ARRAY['admin', 'lead_analyst']::public.app_role[])
        OR EXISTS (SELECT 1 FROM public.case_members cm WHERE cm.case_id = c.id AND cm.user_id = _user_id)
      )
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_case(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_case(UUID, UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.deeptrace_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.deeptrace_set_updated_at();
CREATE TRIGGER cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.deeptrace_set_updated_at();
CREATE TRIGGER evidence_updated_at BEFORE UPDATE ON public.evidence FOR EACH ROW EXECUTE FUNCTION public.deeptrace_set_updated_at();
CREATE TRIGGER entities_updated_at BEFORE UPDATE ON public.entities FOR EACH ROW EXECUTE FUNCTION public.deeptrace_set_updated_at();
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.deeptrace_set_updated_at();
CREATE TRIGGER findings_updated_at BEFORE UPDATE ON public.findings FOR EACH ROW EXECUTE FUNCTION public.deeptrace_set_updated_at();

CREATE OR REPLACE FUNCTION public.deeptrace_bootstrap_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_organization_id UUID;
BEGIN
  INSERT INTO public.organizations (name) VALUES ('My investigation workspace') RETURNING id INTO new_organization_id;
  INSERT INTO public.user_roles (organization_id, user_id, role) VALUES (new_organization_id, NEW.id, 'admin');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.deeptrace_bootstrap_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER deeptrace_auth_user_bootstrap AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.deeptrace_bootstrap_user();

CREATE POLICY organizations_read_members ON public.organizations FOR SELECT TO authenticated USING (public.has_org_role(auth.uid(), id));
CREATE POLICY organizations_update_admins ON public.organizations FOR UPDATE TO authenticated USING (public.has_org_role(auth.uid(), id, ARRAY['admin']::public.app_role[])) WITH CHECK (public.has_org_role(auth.uid(), id, ARRAY['admin']::public.app_role[]));
CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY cases_read_case_members ON public.cases FOR SELECT TO authenticated USING (public.can_access_case(auth.uid(), id));
CREATE POLICY cases_insert_org_investigators ON public.cases FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.has_org_role(auth.uid(), organization_id, ARRAY['admin', 'lead_analyst', 'analyst']::public.app_role[]));
CREATE POLICY cases_update_case_investigators ON public.cases FOR UPDATE TO authenticated USING (public.can_access_case(auth.uid(), id) AND public.has_org_role(auth.uid(), organization_id, ARRAY['admin', 'lead_analyst', 'analyst']::public.app_role[])) WITH CHECK (public.can_access_case(auth.uid(), id) AND public.has_org_role(auth.uid(), organization_id, ARRAY['admin', 'lead_analyst', 'analyst']::public.app_role[]));
CREATE POLICY cases_delete_leads ON public.cases FOR DELETE TO authenticated USING (public.has_org_role(auth.uid(), organization_id, ARRAY['admin', 'lead_analyst']::public.app_role[]));

CREATE POLICY case_members_read_case_members ON public.case_members FOR SELECT TO authenticated USING (public.can_access_case(auth.uid(), case_id));
CREATE POLICY case_members_insert_self_created_case ON public.case_members FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.organization_id = organization_id AND c.created_by = auth.uid())) OR public.has_org_role(auth.uid(), organization_id, ARRAY['admin', 'lead_analyst']::public.app_role[]));
CREATE POLICY case_members_delete_leads ON public.case_members FOR DELETE TO authenticated USING (public.has_org_role(auth.uid(), organization_id, ARRAY['admin', 'lead_analyst']::public.app_role[]));

CREATE POLICY evidence_read_case_members ON public.evidence FOR SELECT TO authenticated USING (public.can_access_case(auth.uid(), case_id));
CREATE POLICY evidence_insert_investigators ON public.evidence FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.can_access_case(auth.uid(), case_id) AND public.has_org_role(auth.uid(), organization_id, ARRAY['admin', 'lead_analyst', 'analyst']::public.app_role[]));
CREATE POLICY evidence_update_investigators ON public.evidence FOR UPDATE TO authenticated USING (public.can_access_case(auth.uid(), case_id) AND public.has_org_role(auth.uid(), organization_id, ARRAY['admin', 'lead_analyst', 'analyst']::public.app_role[])) WITH CHECK (public.can_access_case(auth.uid(), case_id) AND public.has_org_role(auth.uid(), organization_id, ARRAY['admin', 'lead_analyst', 'analyst']::public.app_role[]));
CREATE POLICY evidence_delete_leads ON public.evidence FOR DELETE TO authenticated USING (public.has_org_role(auth.uid(), organization_id, ARRAY['admin', 'lead_analyst']::public.app_role[]));

CREATE POLICY evidence_sources_access_case ON public.evidence_sources FOR ALL TO authenticated USING (public.can_access_case(auth.uid(), case_id)) WITH CHECK (public.can_access_case(auth.uid(), case_id));
CREATE POLICY entities_access_case ON public.entities FOR ALL TO authenticated USING (public.can_access_case(auth.uid(), case_id)) WITH CHECK (public.can_access_case(auth.uid(), case_id));
CREATE POLICY entity_observations_access_case ON public.entity_observations FOR ALL TO authenticated USING (public.can_access_case(auth.uid(), case_id)) WITH CHECK (public.can_access_case(auth.uid(), case_id));
CREATE POLICY relationships_access_case ON public.relationships FOR ALL TO authenticated USING (public.can_access_case(auth.uid(), case_id)) WITH CHECK (public.can_access_case(auth.uid(), case_id));
CREATE POLICY campaigns_access_case ON public.campaigns FOR ALL TO authenticated USING (public.can_access_case(auth.uid(), case_id)) WITH CHECK (public.can_access_case(auth.uid(), case_id));
CREATE POLICY campaign_entities_access_case ON public.campaign_entities FOR ALL TO authenticated USING (public.can_access_case(auth.uid(), case_id)) WITH CHECK (public.can_access_case(auth.uid(), case_id));
CREATE POLICY timeline_events_access_case ON public.timeline_events FOR ALL TO authenticated USING (public.can_access_case(auth.uid(), case_id)) WITH CHECK (public.can_access_case(auth.uid(), case_id));
CREATE POLICY findings_access_case ON public.findings FOR ALL TO authenticated USING (public.can_access_case(auth.uid(), case_id)) WITH CHECK (public.can_access_case(auth.uid(), case_id));
CREATE POLICY finding_evidence_access_case ON public.finding_evidence FOR ALL TO authenticated USING (public.can_access_case(auth.uid(), case_id)) WITH CHECK (public.can_access_case(auth.uid(), case_id));
CREATE POLICY attack_techniques_access_case ON public.attack_techniques FOR ALL TO authenticated USING (public.can_access_case(auth.uid(), case_id)) WITH CHECK (public.can_access_case(auth.uid(), case_id));
CREATE POLICY audit_logs_read_case_members ON public.audit_logs FOR SELECT TO authenticated USING (CASE WHEN case_id IS NULL THEN public.has_org_role(auth.uid(), organization_id) ELSE public.can_access_case(auth.uid(), case_id) END);
CREATE POLICY audit_logs_insert_case_members ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() AND CASE WHEN case_id IS NULL THEN public.has_org_role(auth.uid(), organization_id) ELSE public.can_access_case(auth.uid(), case_id) END);