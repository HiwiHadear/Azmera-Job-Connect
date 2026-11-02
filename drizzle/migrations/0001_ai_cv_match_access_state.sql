CREATE TABLE public.ai_cv_match_access_state (
 id text PRIMARY KEY,
 message text NOT NULL,
 status integer NOT NULL DEFAULT 403,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_cv_match_access_state TO service_role;
ALTER TABLE public.ai_cv_match_access_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server manages AI access state" ON public.ai_cv_match_access_state FOR ALL TO service_role USING (true) WITH CHECK (true);