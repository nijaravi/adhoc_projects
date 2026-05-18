/* ────────────────────────────────────────────────────────────
   ACE Intelligence Platform — Dashboard Data
   ────────────────────────────────────────────────────────────
   Edit this file to update the dashboard. The dashboard reloads
   this file every 5 minutes (cache-busted), so saved changes
   appear on the next refresh cycle automatically. Reload the
   page to see changes immediately.

   STATUS VOCABULARY (matches production Airflow):
   ──────────────────────────────────────────────────────────
     SUCCESS              — DAG completed successfully
     RUNNING              — currently executing
     FAILED               — DAG failed during this run
     UP_FOR_RESCHEDULE    — failed once, awaiting retry slot
     NOT_STARTED          — not yet picked up by scheduler
     QUEUED               — picked up, waiting for a worker
     UPSTREAM_FAILED      — blocked because an upstream failed
     SKIPPED              — intentionally bypassed this run
     REMOVED              — removed from the DAG bag this run

   Every card's label is driven by the status string below.
   The dashboard never infers a status — what you write here is
   what shows on the card.

   OPTIONAL FIELDS:
   ──────────────────────────────────────────────────────────
     attempt_number — integer, only meaningful on UP_FOR_RESCHEDULE
                      rows. Shown as the middle "Attempt" column on
                      the card. If omitted, the card renders "—".

   Scenario: Daily batch kicked off at 06:00 AM. "Now" is roughly
   08:30 AM — batch is ~2.5 hours in. Deposit Details failed at
   07:08, cascading into Deposit Genome (UPSTREAM_FAILED).
   ──────────────────────────────────────────────────────────── */

window.DASHBOARD_DATA = {
  "refresh_date": "2026-05-13",
  "partition_id": "P_2176",
  "callout": "Daily batch started at 06:00 AM · Deposit Details DAG failed at 07:08 — Deposit Genome blocked downstream",
  "last_refresh": "2026-05-13 08:30:00",

  "ace_consumption": [
    /* ── First wave (06:00 kickoff): customer + lookup tables ─────── */
    { "dag_name": "t0_wbg_cl_customer_details",       "status": "SUCCESS",           "start_time": "2026-05-13 06:00:00", "end_time": "2026-05-13 06:12:00", "avg_runtime_minutes": 12 },
    { "dag_name": "t0_rbg_cl_lkp_finnone_details",    "status": "SUCCESS",           "start_time": "2026-05-13 06:00:00", "end_time": "2026-05-13 06:11:00", "avg_runtime_minutes": 11 },
    { "dag_name": "t0_rbg_cl_customer_details_v2",    "status": "SUCCESS",           "start_time": "2026-05-13 06:00:00", "end_time": "2026-05-13 06:11:00", "avg_runtime_minutes": 11 },
    { "dag_name": "t0_rbg_cl_adib_securities",        "status": "SUCCESS",           "start_time": "2026-05-13 06:00:00", "end_time": "2026-05-13 06:11:00", "avg_runtime_minutes": 11 },

    /* ── Second wave (~06:15): finance + cards ────────────────────── */
    { "dag_name": "t0_rbg_cl_direct_load_tables",     "status": "SUCCESS",           "start_time": "2026-05-13 06:15:00", "end_time": "2026-05-13 06:23:00", "avg_runtime_minutes":  8 },
    { "dag_name": "t0_rbg_cl_debit_card_details",     "status": "SUCCESS",           "start_time": "2026-05-13 06:15:00", "end_time": "2026-05-13 06:26:00", "avg_runtime_minutes": 11 },
    { "dag_name": "t0_rbg_cl_covered_card_details",   "status": "UP_FOR_RESCHEDULE", "start_time": "2026-05-18 16:10:00", "end_time": null,                  "avg_runtime_minutes": 15, "attempt_number": 2 },

    /* ── Third wave (~06:30): the big finance pulls ───────────────── */
    { "dag_name": "t0_wbg_cl_finance_details",        "status": "SUCCESS",           "start_time": "2026-05-13 06:30:00", "end_time": "2026-05-13 06:48:00", "avg_runtime_minutes": 18 },
    { "dag_name": "t0_rbg_cl_finance_details",        "status": "SUCCESS",           "start_time": "2026-05-13 06:30:00", "end_time": "2026-05-13 06:46:00", "avg_runtime_minutes": 16 },

    /* ── Fourth wave (~07:00): deposits — one failed, one in flight ─ */
    { "dag_name": "t0_wbg_cl_deposit_details",        "status": "FAILED",            "start_time": "2026-05-13 07:00:00", "end_time": "2026-05-13 07:08:00", "avg_runtime_minutes": 10 },
    { "dag_name": "t0_rbg_cl_deposit_details",        "status": "RUNNING",           "start_time": "2026-05-13 08:20:00", "end_time": null,                  "avg_runtime_minutes": 13 },

    /* ── Last in line: wakala queued, non-funded not yet scheduled ── */
    { "dag_name": "t0_rbg_cl_deposit_wakala_details", "status": "QUEUED",            "start_time": null,                  "end_time": null,                  "avg_runtime_minutes": 12 },
    { "dag_name": "t0_wbg_cl_non_funded_exposure",    "status": "NOT_STARTED",       "start_time": null,                  "end_time": null,                  "avg_runtime_minutes": 10 }
  ],

  "ace_analytics": [
    /* ── Genomes that ran early (their upstreams finished early) ──── */
    { "dag_name": "t0_wbg_customer_genome",     "status": "SUCCESS",           "start_time": "2026-05-13 06:30:00", "end_time": "2026-05-13 06:40:00", "avg_runtime_minutes": 10 },
    { "dag_name": "t0_ace_prepaid_card_genome", "status": "SUCCESS",           "start_time": "2026-05-13 06:45:00", "end_time": "2026-05-13 06:57:00", "avg_runtime_minutes": 12 },
    { "dag_name": "t0_ace_debit_card_genome",   "status": "SUCCESS",           "start_time": "2026-05-13 06:45:00", "end_time": "2026-05-13 06:57:00", "avg_runtime_minutes": 12 },

    /* ── Currently running ────────────────────────────────────────── */
    { "dag_name": "t0_ace_application_genome",  "status": "RUNNING",           "start_time": "2026-05-13 08:15:00", "end_time": null,                  "avg_runtime_minutes": 15 },
    { "dag_name": "t0_wbg_finance_genome",      "status": "RUNNING",           "start_time": "2026-05-13 08:00:00", "end_time": null,                  "avg_runtime_minutes": 12 },

    /* ── Awaiting retry slot ──────────────────────────────────────── */
    { "dag_name": "t0_ace_covered_card_genome", "status": "UP_FOR_RESCHEDULE", "start_time": "2026-05-18 16:25:00", "end_time": null,                  "avg_runtime_minutes": 13, "attempt_number": 1 },

    /* ── Blocked by failed upstream (deposit details) ─────────────── */
    { "dag_name": "t0_wbg_deposit_genome",      "status": "UPSTREAM_FAILED",   "start_time": null,                  "end_time": null,                  "avg_runtime_minutes": 12 },

    /* ── Queued, waiting for worker / upstream ────────────────────── */
    { "dag_name": "t0_ace_deposit_genome",      "status": "QUEUED",            "start_time": null,                  "end_time": null,                  "avg_runtime_minutes": 14 },

    /* ── Intentionally bypassed this run ──────────────────────────── */
    { "dag_name": "t0_ace_finance_genome",      "status": "SKIPPED",           "start_time": null,                  "end_time": null,                  "avg_runtime_minutes": 14 },

    /* ── Removed from DAG bag for this run ────────────────────────── */
    { "dag_name": "t0_ace_customer_genome",     "status": "REMOVED",           "start_time": null,                  "end_time": null,                  "avg_runtime_minutes": 11 }
  ]
};
