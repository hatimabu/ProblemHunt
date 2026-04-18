-- Migration: Enable RLS for payments
-- Date: 2026-03-24
-- Description: Restricts payment reads/inserts to the involved marketplace users.

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payer can insert payment" ON public.payments;
DROP POLICY IF EXISTS "Involved users can view payment" ON public.payments;

CREATE POLICY "Payer can insert payment"
ON public.payments FOR INSERT
WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Involved users can view payment"
ON public.payments FOR SELECT
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
