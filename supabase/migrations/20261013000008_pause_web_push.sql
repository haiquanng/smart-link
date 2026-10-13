-- Web Push reminders are paused (owner decision, 2026-10-13); Resurface stays in
-- its tab. Stop the hourly call to send-reminders. The table, function and
-- frontend code stay, so resuming = set the VAPID keys (development-workflow.md
-- -> Web Push setup) and re-run the cron.schedule block from 20261013000006.
select cron.unschedule(jobid) from cron.job where jobname = 'send-reminders';
