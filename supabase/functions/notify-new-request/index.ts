// Sends a Web Push notification to every on-duty staff member of a hotel
// when a new guest_requests row is inserted. Wired up via a Supabase
// Database Webhook (table guest_requests, event INSERT, pointing at this
// function's URL) — configured in the dashboard, not in SQL, so there is no
// migration for the webhook itself.
//
// Only on_duty staff receive anything (see 0013_push_notifications.sql for
// why on_duty is a self-scoped RPC rather than a direct column write), and
// only for requests created by a guest — createStaffRequest-originated rows
// (created_by_staff set) don't need to alert the staff member who just made
// them.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@roomcall.app'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

interface WebhookPayload {
  type: 'INSERT'
  table: string
  record: {
    id: string
    hotel_id: string
    room_number: string
    request_type_id: string
    created_by_staff: string | null
    quantity: number | null
    note: string | null
    assigned_department: string
  }
}

const DEPARTMENT_LABEL: Record<string, string> = {
  housekeeping: 'Housekeeping',
  reception: 'Reception',
  maintenance: 'Manutenzione',
  porter: 'Portineria',
}

Deno.serve(async (req: Request) => {
  try {
    const payload = (await req.json()) as WebhookPayload
    if (payload.type !== 'INSERT' || payload.table !== 'guest_requests') {
      return json({ skipped: 'not_an_insert' }, 200)
    }
    const record = payload.record
    if (record.created_by_staff) {
      return json({ skipped: 'staff_created' }, 200)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: requestType } = await admin
      .from('request_types')
      .select('name, request_categories(name)')
      .eq('id', record.request_type_id)
      .maybeSingle()
    const itemName = requestType?.name ?? 'richiesta'
    const categoryName = (requestType?.request_categories as { name: string } | null)?.name ?? null

    const { data: staff, error: staffError } = await admin
      .from('staff_profiles')
      .select('id')
      .eq('hotel_id', record.hotel_id)
      .eq('active', true)
      .eq('on_duty', true)
    if (staffError) throw staffError
    if (!staff || staff.length === 0) return json({ sent: 0, reason: 'no_one_on_duty' }, 200)

    const staffIds = staff.map((s) => s.id)
    const { data: subs, error: subsError } = await admin.from('push_subscriptions').select('*').in('staff_id', staffIds)
    if (subsError) throw subsError
    if (!subs || subs.length === 0) return json({ sent: 0, reason: 'no_subscriptions' }, 200)

    const departmentLabel = DEPARTMENT_LABEL[record.assigned_department] ?? record.assigned_department
    const title = `Camera ${record.room_number} · ${departmentLabel}`
    const bodyLines = [itemName + (record.quantity ? ` × ${record.quantity}` : '')]
    if (categoryName) bodyLines.push(categoryName)
    if (record.note) bodyLines.push(record.note)
    const body = bodyLines.join('\n')
    const notificationPayload = JSON.stringify({
      title,
      body,
      data: { requestId: record.id, url: `/staff?claim=${record.id}` },
    })

    let sent = 0
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            notificationPayload,
          )
          sent++
        } catch (err) {
          // 404/410 means the browser dropped the subscription (uninstalled,
          // permission revoked, storage cleared) — remove it so future sends
          // don't keep retrying a dead endpoint. Any other error is left
          // alone; it might be transient.
          const status = (err as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) {
            await admin.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      }),
    )

    return json({ sent, total: subs.length }, 200)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'unknown_error' }, 500)
  }
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
