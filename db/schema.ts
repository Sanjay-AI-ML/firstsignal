import { sqliteTable, text, integer, primaryKey, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
export const profiles = sqliteTable("profiles", {
  id:text("id").primaryKey(), owner:text("owner").notNull(), kind:text("kind").notNull(),
  data:text("data").notNull(), listed:integer("listed").notNull().default(0), updated:text("updated").notNull(),
}, t=>[index("profiles_owner_kind_lookup").on(t.owner,t.kind),uniqueIndex("profiles_investor_owner").on(t.owner).where(sql`${t.kind} = 'investor'`),index("profiles_listed").on(t.listed),index("profiles_listed_updated").on(t.listed,t.updated)]);
export const profileVersions = sqliteTable("profile_versions", {
  profileId:text("profile_id").primaryKey(),version:integer("version").notNull().default(1),lastOperation:text("last_operation").notNull().default(""),updated:text("updated").notNull(),
});
export const saves = sqliteTable("saves", {owner:text("owner").notNull(),profileId:text("profile_id").notNull(),created:text("created").notNull()},t=>[primaryKey({columns:[t.owner,t.profileId]}),index("saves_owner_created").on(t.owner,t.created)]);
export const introductions=sqliteTable("introductions",{
  id:text("id").primaryKey(),sender:text("sender").notNull(),recipient:text("recipient"),profileId:text("profile_id").notNull(),sourceProfileId:text("source_profile_id").references(()=>profiles.id),sourceName:text("source_name"),targetName:text("target_name").notNull(),senderName:text("sender_name").notNull(),message:text("message").notNull(),status:text("status").notNull(),created:text("created").notNull(),updated:text("updated").notNull(),
},t=>[uniqueIndex("introductions_sender_profile_source").on(t.sender,t.profileId,sql`coalesce(${t.sourceProfileId}, '')`),index("introductions_recipient").on(t.recipient),index("introductions_sender_created").on(t.sender,t.created)]);
export const messages=sqliteTable("messages",{id:text("id").primaryKey(),introductionId:text("introduction_id").notNull().references(()=>introductions.id),sender:text("sender").notNull(),senderName:text("sender_name").notNull(),body:text("body").notNull(),created:text("created").notNull()},t=>[index("messages_introduction_created").on(t.introductionId,t.created),index("messages_introduction_created_id").on(t.introductionId,t.created,t.id)]);
export const negotiations=sqliteTable("negotiations",{introductionId:text("introduction_id").primaryKey().references(()=>introductions.id),version:integer("version").notNull(),author:text("author").notNull(),amount:integer("amount").notNull(),terms:text("terms").notNull(),status:text("status").notNull(),eventId:text("event_id").notNull(),updated:text("updated").notNull()});
export const negotiationEvents=sqliteTable("negotiation_events",{id:text("id").primaryKey(),introductionId:text("introduction_id").notNull().references(()=>introductions.id),version:integer("version").notNull(),author:text("author").notNull(),authorName:text("author_name").notNull(),amount:integer("amount").notNull(),terms:text("terms").notNull(),status:text("status").notNull(),created:text("created").notNull()},t=>[uniqueIndex("negotiation_event_version").on(t.introductionId,t.version)]);
export const notificationPreferences=sqliteTable("notification_preferences",{owner:text("owner").primaryKey(),email:text("email").notNull(),enabled:integer("enabled").notNull().default(0)});
export const notifications=sqliteTable("notifications",{id:text("id").primaryKey(),owner:text("owner").notNull(),introductionId:text("introduction_id").notNull(),title:text("title").notNull(),status:text("status").notNull().default("pending"),created:text("created").notNull()},t=>[index("notification_owner_status").on(t.owner,t.status)]);
export const memberBlocks=sqliteTable("member_blocks",{owner:text("owner").notNull(),targetOwner:text("target_owner").notNull(),profileId:text("profile_id").notNull(),targetName:text("target_name").notNull(),created:text("created").notNull()},t=>[primaryKey({columns:[t.owner,t.targetOwner]}),index("member_blocks_target").on(t.targetOwner)]);
export const memberReports=sqliteTable("member_reports",{id:text("id").primaryKey(),owner:text("owner").notNull(),targetOwner:text("target_owner").notNull(),profileId:text("profile_id").notNull(),reason:text("reason").notNull(),details:text("details").notNull(),status:text("status").notNull().default("submitted"),created:text("created").notNull(),version:integer("version").notNull().default(0),updated:text("updated").notNull().default(""),operatorNote:text("operator_note").notNull().default(""),lastAdminEvent:text("last_admin_event").notNull().default("")},t=>[index("member_reports_owner_created").on(t.owner,t.created),index("member_reports_status_created").on(t.status,t.created)]);
export const progressUpdates=sqliteTable("progress_updates",{id:text("id").primaryKey(),profileId:text("profile_id").notNull().references(()=>profiles.id),date:text("date").notNull(),title:text("title").notNull(),body:text("body").notNull(),created:text("created").notNull()},t=>[index("progress_updates_profile_created").on(t.profileId,t.created)]);
export const connectionNextSteps=sqliteTable("connection_next_steps",{owner:text("owner").notNull(),introductionId:text("introduction_id").notNull().references(()=>introductions.id),note:text("note").notNull(),date:text("date").notNull().default(""),updated:text("updated").notNull()},t=>[primaryKey({columns:[t.owner,t.introductionId]})]);
export const profileModeration=sqliteTable("profile_moderation",{profileId:text("profile_id").primaryKey().references(()=>profiles.id),hidden:integer("hidden").notNull().default(0),reason:text("reason").notNull(),version:integer("version").notNull(),eventId:text("event_id").notNull(),updated:text("updated").notNull()});
export const adminAudit=sqliteTable("admin_audit",{id:text("id").primaryKey(),actor:text("actor").notNull(),action:text("action").notNull(),targetId:text("target_id").notNull(),reason:text("reason").notNull(),previousState:text("previous_state").notNull(),nextState:text("next_state").notNull(),created:text("created").notNull()},t=>[index("admin_audit_created").on(t.created)]);
export const ideaExperiments=sqliteTable("idea_experiments",{
  id:text("id").primaryKey(),profileId:text("profile_id").notNull().references(()=>profiles.id),
  plan:text("plan").notNull(),result:text("result").notNull().default("{}"),
  status:text("status").notNull().default("draft"),shared:integer("shared").notNull().default(0),version:integer("version").notNull().default(0),
  created:text("created").notNull(),startedAt:text("started_at").notNull().default(""),completedAt:text("completed_at").notNull().default(""),updated:text("updated").notNull(),
},t=>[index("idea_experiments_profile_created").on(t.profileId,t.created)]);
export const notificationEmails=sqliteTable("notification_emails",{
  notificationId:text("notification_id").primaryKey().references(()=>notifications.id),kind:text("kind").notNull(),state:text("state").notNull().default("pending"),
  providerId:text("provider_id").notNull().default(""),recipient:text("recipient").notNull().default(""),requestBody:text("request_body").notNull().default(""),consentVersion:text("consent_version").notNull().default(""),
  attempts:integer("attempts").notNull().default(0),firstAttemptAt:text("first_attempt_at").notNull().default(""),nextAttemptAt:text("next_attempt_at").notNull().default(""),leaseUntil:text("lease_until").notNull().default(""),leaseToken:text("lease_token").notNull().default(""),lastError:text("last_error").notNull().default(""),eventAt:text("event_at").notNull().default(""),eventId:text("event_id").notNull().default(""),created:text("created").notNull(),updated:text("updated").notNull(),
},t=>[uniqueIndex("notification_emails_provider").on(t.providerId).where(sql`${t.providerId} <> ''`),index("notification_emails_due").on(t.state,t.nextAttemptAt)]);
export const notificationEmailControls=sqliteTable("notification_email_controls",{
  owner:text("owner").primaryKey(),consentVersion:text("consent_version").notNull(),suppressedEmail:text("suppressed_email").notNull().default(""),suppressionReason:text("suppression_reason").notNull().default(""),updated:text("updated").notNull(),
});
export const notificationEmailEvents=sqliteTable("notification_email_events",{
  id:text("id").primaryKey(),notificationId:text("notification_id").notNull().references(()=>notifications.id),providerId:text("provider_id").notNull(),type:text("type").notNull(),eventAt:text("event_at").notNull(),received:text("received").notNull(),
},t=>[index("notification_email_events_notification").on(t.notificationId)]);
export const notificationDispatchLease=sqliteTable("notification_dispatch_lease",{
  id:text("id").primaryKey(),token:text("token").notNull(),expires:text("expires").notNull(),updated:text("updated").notNull(),
});
export const idempotencyKeys=sqliteTable("idempotency_keys",{
  id:text("id").primaryKey(),owner:text("owner").notNull(),operationId:text("operation_id").notNull(),action:text("action").notNull(),resourceId:text("resource_id").notNull().default(""),response:text("response").notNull(),payloadHash:text("payload_hash").notNull().default(""),created:text("created").notNull(),
},t=>[index("idempotency_keys_owner_created").on(t.owner,t.created)]);
export const dailyQuotas=sqliteTable("daily_quotas",{
  owner:text("owner").notNull(),quotaKey:text("quota_key").notNull(),dateBucket:text("date_bucket").notNull(),count:integer("count").notNull().default(0),
},t=>[primaryKey({columns:[t.owner,t.quotaKey,t.dateBucket]})]);
export const conversationReadPositions=sqliteTable("conversation_read_positions",{
  introductionId:text("introduction_id").notNull().references(()=>introductions.id,{onDelete:"cascade"}),userId:text("user_id").notNull(),lastReadMessageId:text("last_read_message_id").notNull().default(""),lastReadAt:text("last_read_at").notNull(),
},t=>[primaryKey({columns:[t.introductionId,t.userId]})]);
export const ideaRevisions=sqliteTable("idea_revisions",{
  id:text("id").primaryKey(),profileId:text("profile_id").notNull().references(()=>profiles.id,{onDelete:"cascade"}),version:integer("version").notNull(),data:text("data").notNull(),listed:integer("listed").notNull().default(0),changeSummary:text("change_summary").notNull(),created:text("created").notNull(),author:text("author").notNull(),
},t=>[uniqueIndex("idea_revisions_profile_version").on(t.profileId,t.version)]);
export const savedSearches=sqliteTable("saved_searches",{
  id:text("id").primaryKey(),owner:text("owner").notNull(),name:text("name").notNull(),query:text("query").notNull(),filters:text("filters").notNull(),alertsEnabled:integer("alerts_enabled").notNull().default(0),created:text("created").notNull(),
},t=>[index("saved_searches_owner_created").on(t.owner,t.created)]);
export const accountClosures=sqliteTable("account_closures",{
  owner:text("owner").primaryKey(),status:text("status").notNull().default("pending"),requestedAt:text("requested_at").notNull(),retentionUntil:text("retention_until").notNull(),reason:text("reason").notNull().default(""),updated:text("updated").notNull(),
});
