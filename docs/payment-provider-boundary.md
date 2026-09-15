# Payment provider boundary

ProblemHunt now owns the marketplace contract lifecycle but does not move funds.
The browser can accept proposals, read participant-visible contract state, submit
deliveries, approve deliveries, cancel before funding, and open disputes.

Funding confirmation is intentionally isolated behind `confirm_job_funded`.
That function is granted only to Supabase's `service_role`; authenticated browser
sessions cannot call it. A future server-side provider adapter must verify all of
the following before invoking it:

- the provider event is authentic and finalized;
- the reference has not been processed before;
- the payer and contract match;
- the asset, network, destination, and exact amount match;
- the contract is still `awaiting_funding`.

Release and refund confirmations should follow the same design: provider event
verification first, then an idempotent service-role-only database transition.
Never place a service-role key, signing key, or payment-provider secret in Vite
environment variables or browser code.

Before enabling real payments, obtain legal review for marketplace custody and
dispute handling, select a regulated provider, add webhook replay protection,
test failure recovery, and obtain an independent security review.
