import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { GraphQLContext } from "../context";

export const userSettingsResolvers = {
  Query: {
    async userSettings(
      _parent: unknown,
      args: { userId: string },
      context: GraphQLContext,
    ) {
      try {
        // Enforce ownership: users can only read their own settings
        if (!context.userId) {
          throw new Error("Authentication required");
        }
        if (args.userId !== context.userId) {
          throw new Error("Forbidden: cannot access another user's settings");
        }

        const [settings] = await context.db
          .select()
          .from(userSettings)
          .where(eq(userSettings.user_id, context.userId));

        if (!settings) {
          return null;
        }

        // Parse JSON fields
        return {
          ...settings,
          excluded_companies: settings.excluded_companies
            ? JSON.parse(settings.excluded_companies)
            : [],
        };
      } catch (error) {
        console.error("Error fetching user settings:", error);
        return null;
      }
    },
  },

  Mutation: {
    async updateUserSettings(
      _parent: unknown,
      args: {
        userId: string;
        settings: {
          email_notifications?: boolean;
          daily_digest?: boolean;
          excluded_companies?: string[];
          dark_mode?: boolean;
        };
      },
      context: GraphQLContext,
    ) {
      try {
        // Enforce ownership: users can only update their own settings
        if (!context.userId) {
          throw new Error("Authentication required");
        }
        if (args.userId !== context.userId) {
          throw new Error("Forbidden: cannot modify another user's settings");
        }

        const { settings: settingsInput } = args;
        const userId = context.userId;

        // Check if settings exist
        const [existingSettings] = await context.db
          .select()
          .from(userSettings)
          .where(eq(userSettings.user_id, userId));

        const settingsData = {
          user_id: userId,
          ...(settingsInput.email_notifications !== undefined && {
            email_notifications: settingsInput.email_notifications,
          }),
          ...(settingsInput.daily_digest !== undefined && {
            daily_digest: settingsInput.daily_digest,
          }),
          ...(settingsInput.excluded_companies !== undefined && {
            excluded_companies: JSON.stringify(
              settingsInput.excluded_companies,
            ),
          }),
          ...(settingsInput.dark_mode !== undefined && {
            dark_mode: settingsInput.dark_mode,
          }),
          updated_at: new Date().toISOString(),
        };

        let result;
        if (existingSettings) {
          // Update existing settings
          [result] = await context.db
            .update(userSettings)
            .set(settingsData)
            .where(eq(userSettings.user_id, userId))
            .returning();
        } else {
          // Insert new settings
          [result] = await context.db
            .insert(userSettings)
            .values(settingsData)
            .returning();
        }

        // Parse JSON fields for response
        return {
          ...result,
          excluded_companies: result.excluded_companies
            ? JSON.parse(result.excluded_companies)
            : [],
        };
      } catch (error) {
        console.error("Error updating user settings:", error);
        throw new Error("Failed to update user settings");
      }
    },
  },
};
