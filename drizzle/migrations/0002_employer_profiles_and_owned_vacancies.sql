CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 contact_name text NOT NULL DEFAULT '' CHECK (char_length(contact_name) <= 120),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE FUNCTION public.create_employer_contact_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.profiles(id) VALUES (NEW.id) ON CONFLICT DO NOTHING; RETURN NEW; END; $$;
CREATE TRIGGER create_employer_contact_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_employer_contact_profile();
INSERT INTO public.profiles(id) SELECT id FROM auth.users ON CONFLICT DO NOTHING;
ALTER TABLE public.companies ADD COLUMN owner_id uuid;
CREATE UNIQUE INDEX companies_one_per_owner ON public.companies(owner_id) WHERE owner_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
CREATE POLICY "employer insert company" ON public.companies FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "employer update company" ON public.companies FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE FUNCTION public.protect_company_owner() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF NEW.owner_id IS DISTINCT FROM OLD.owner_id AND auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Company ownership cannot be changed'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER protect_company_owner BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.protect_company_owner();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
CREATE POLICY "employer read own vacancies" ON public.jobs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = jobs.company_id AND c.owner_id = auth.uid()));
CREATE POLICY "employer insert vacancies" ON public.jobs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = jobs.company_id AND c.owner_id = auth.uid()));
CREATE POLICY "employer update vacancies" ON public.jobs FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = jobs.company_id AND c.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = jobs.company_id AND c.owner_id = auth.uid()));
CREATE POLICY "employer delete vacancies" ON public.jobs FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = jobs.company_id AND c.owner_id = auth.uid()));
CREATE FUNCTION public.validate_employer_vacancy() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
 IF NEW.status NOT IN ('draft','published','closed') OR NEW.is_featured OR NEW.is_urgent THEN RAISE EXCEPTION 'Invalid vacancy settings'; END IF;
 IF NEW.external_url IS NULL OR NEW.external_url !~ '^https?://[^[:space:]]+$' OR char_length(NEW.external_url) > 2048 THEN RAISE EXCEPTION 'A valid application form link is required'; END IF;
 IF char_length(trim(NEW.title)) NOT BETWEEN 1 AND 160 OR char_length(trim(NEW.summary)) NOT BETWEEN 1 AND 10000 OR char_length(NEW.location) > 160 OR char_length(NEW.responsibilities) > 10000 OR char_length(NEW.qualifications) > 10000 OR char_length(NEW.experience) > 5000 THEN RAISE EXCEPTION 'Invalid vacancy details'; END IF;
 IF NEW.employment_type NOT IN ('Full-Time','Part-Time','Contractual','Freelance','Internship') OR NEW.work_mode NOT IN ('On-Site','Remote','Hybrid') OR NEW.experience_level NOT IN ('Fresher','Beginner','Intermediate','Expert') THEN RAISE EXCEPTION 'Invalid vacancy classification'; END IF;
 IF NEW.salary_min < 0 OR NEW.salary_max < 0 OR NEW.salary_min > NEW.salary_max THEN RAISE EXCEPTION 'Invalid salary range'; END IF;
 END IF; RETURN NEW; END; $$;
CREATE TRIGGER validate_employer_vacancy BEFORE INSERT OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.validate_employer_vacancy();