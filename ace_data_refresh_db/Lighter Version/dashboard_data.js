/* ────────────────────────────────────────────────────────────
   ACE Intelligence Platform — Dashboard Data
   ────────────────────────────────────────────────────────────
   Edit this file to update the dashboard. The dashboard reloads
   this file every 2 minutes (cache-busted), so saved changes
   appear on the next refresh cycle automatically. Reload the
   page to see changes immediately.

   Scenario: Daily batch kicked off at 06:00 AM. "Now" is roughly
   08:30 AM — batch is ~2.5 hours in. Consumption layer is mostly
   done, analytics genomes are picking up downstream.
   ──────────────────────────────────────────────────────────── */

window.DASHBOARD_DATA = {
  "refresh_date": "2026-05-13",
  "partition_id": "P_2176",
  "callout": "Daily batch started at 06:00 AM · Network blip at 07:15 caused 1 retry — recovering normally",
  "last_refresh": "2026-05-13 08:30:00",

  "ace_consumption": [
    /* ── First wave (06:00 kickoff): customer + lookup tables ─────── */
    { "dag_name": "t0_wbg_cl_customer_details",       "status": "DONE",                 "start_time": "2026-05-13 06:00:00", "end_time": "2026-05-13 06:12:00", "avg_runtime_minutes": 12 },
    { "dag_name": "t0_rbg_cl_lkp_finnone_details",    "status": "DONE",                 "start_time": "2026-05-13 06:00:00", "end_time": "2026-05-13 06:11:00", "avg_runtime_minutes": 11 },
    { "dag_name": "t0_rbg_cl_customer_details_v2",    "status": "DONE",                 "start_time": "2026-05-13 06:00:00", "end_time": "2026-05-13 06:11:00", "avg_runtime_minutes": 11 },
    { "dag_name": "t0_rbg_cl_adib_securities",        "status": "DONE",                 "start_time": "2026-05-13 06:00:00", "end_time": "2026-05-13 06:11:00", "avg_runtime_minutes": 11 },

    /* ── Second wave (~06:15): finance + cards, mostly complete ───── */
    { "dag_name": "t0_rbg_cl_direct_load_tables",     "status": "DONE",                 "start_time": "2026-05-13 06:15:00", "end_time": "2026-05-13 06:23:00", "avg_runtime_minutes":  8 },
    { "dag_name": "t0_rbg_cl_debit_card_details",     "status": "DONE",                 "start_time": "2026-05-13 06:15:00", "end_time": "2026-05-13 06:26:00", "avg_runtime_minutes": 11 },
    { "dag_name": "t0_rbg_cl_covered_card_details",   "status": "RETRY",                "start_time": "2026-05-13 08:10:00", "end_time": null,                  "avg_runtime_minutes": 15 },

    /* ── Third wave (~06:30): the big finance pulls ───────────────── */
    { "dag_name": "t0_wbg_cl_finance_details",        "status": "DONE",                 "start_time": "2026-05-13 06:30:00", "end_time": "2026-05-13 06:48:00", "avg_runtime_minutes": 18 },
    { "dag_name": "t0_rbg_cl_finance_details",        "status": "DONE",                 "start_time": "2026-05-13 06:30:00", "end_time": "2026-05-13 06:46:00", "avg_runtime_minutes": 16 },

    /* ── Fourth wave (~07:00): deposits — one failed, one in flight ─ */
    { "dag_name": "t0_wbg_cl_deposit_details",        "status": "FAILED",               "start_time": "2026-05-13 07:00:00", "end_time": "2026-05-13 07:08:00", "avg_runtime_minutes": 10 },
    { "dag_name": "t0_rbg_cl_deposit_details",        "status": "INPROGRESS",           "start_time": "2026-05-13 08:20:00", "end_time": null,                  "avg_runtime_minutes": 13 },

    /* ── Last to start: wakala + non-funded exposure ──────────────── */
    { "dag_name": "t0_rbg_cl_deposit_wakala_details", "status": "INPROGRESS",           "start_time": "2026-05-13 08:25:00", "end_time": null,                  "avg_runtime_minutes": 12 },
    { "dag_name": "t0_wbg_cl_non_funded_exposure",    "status": "NOT_STARTED",          "start_time": null,                  "end_time": null,                  "avg_runtime_minutes": 10 }
  ],

  "ace_analytics": [
    /* ── Genomes that ran early (their upstreams finished early) ──── */
    { "dag_name": "t0_wbg_customer_genome",     "status": "DONE",                 "start_time": "2026-05-13 06:30:00", "end_time": "2026-05-13 06:40:00", "avg_runtime_minutes": 10 },
    { "dag_name": "t0_ace_prepaid_card_genome", "status": "DONE",                 "start_time": "2026-05-13 06:45:00", "end_time": "2026-05-13 06:57:00", "avg_runtime_minutes": 12 },
    { "dag_name": "t0_ace_debit_card_genome",   "status": "DONE",                 "start_time": "2026-05-13 06:45:00", "end_time": "2026-05-13 06:57:00", "avg_runtime_minutes": 12 },

    /* ── Currently running ────────────────────────────────────────── */
    { "dag_name": "t0_ace_application_genome",  "status": "INPROGRESS",           "start_time": "2026-05-13 08:15:00", "end_time": null,                  "avg_runtime_minutes": 15 },
    { "dag_name": "t0_wbg_finance_genome",      "status": "INPROGRESS",           "start_time": "2026-05-13 08:00:00", "end_time": null,                  "avg_runtime_minutes": 12 },

    /* ── Retry queue ──────────────────────────────────────────────── */
    { "dag_name": "t0_ace_covered_card_genome", "status": "RETRY",                "start_time": "2026-05-13 08:05:00", "end_time": null,                  "avg_runtime_minutes": 13 },

    /* ── Waiting on consumption layer to finish ───────────────────── */
    { "dag_name": "t0_wbg_deposit_genome",      "status": "WAITING_FOR_UPSTREAM", "start_time": null,                  "end_time": null,                  "avg_runtime_minutes": 12 },
    { "dag_name": "t0_ace_deposit_genome",      "status": "WAITING_FOR_UPSTREAM", "start_time": null,                  "end_time": null,                  "avg_runtime_minutes": 14 },
    { "dag_name": "t0_ace_finance_genome",      "status": "NOT_STARTED",          "start_time": null,                  "end_time": null,                  "avg_runtime_minutes": 14 },
    { "dag_name": "t0_ace_customer_genome",     "status": "NOT_STARTED",          "start_time": null,                  "end_time": null,                  "avg_runtime_minutes": 11 }
  ]
};
