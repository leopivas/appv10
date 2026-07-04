import { pgTable, text, boolean, integer } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id:                       text("id").primaryKey(),
  email:                    text("email").notNull().unique(),
  name:                     text("name").notNull(),
  passwordHash:             text("password_hash").notNull().default(""),
  createdAt:                text("created_at").notNull(),
  lastLoginAt:              text("last_login_at"),
  plan:                     text("plan").notNull().default("free"),
  isAdmin:                  boolean("is_admin").notNull().default(false),
  roleId:                   text("role_id"),
  stripeCustomerId:         text("stripe_customer_id"),
  stripeSubscriptionId:     text("stripe_subscription_id"),
  tiktokUsername:           text("tiktok_username"),
  tiktokUsernameChangeLog:  text("tiktok_username_change_log").array().default([]),
  tiktokVerified:           boolean("tiktok_verified").default(false),
  tiktokProfilePicture:     text("tiktok_profile_picture"),
  tiktokDisplayName:        text("tiktok_display_name"),
  tiktokFollowerCount:      integer("tiktok_follower_count"),
  tiktokLinkedAt:           text("tiktok_linked_at"),
  tiktokOAuthId:            text("tiktok_oauth_id"),
  tiktokOAuthAccessToken:   text("tiktok_oauth_access_token"),
  tiktokOAuthRefreshToken:  text("tiktok_oauth_refresh_token"),
  publicProfileEnabled:     boolean("public_profile_enabled").notNull().default(false),
  profileBio:               text("profile_bio"),
  profileBanner:            text("profile_banner"),
  socialLinks:              text("social_links"),
  profileSections:          text("profile_sections"),
  totalLiveSessions:        integer("total_live_sessions").notNull().default(0),
});

export type UserRow = typeof usersTable.$inferSelect;
export type InsertUserRow = typeof usersTable.$inferInsert;
