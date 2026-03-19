"use client";

import { useState, useEffect } from "react";
import { Select, Text, Flex, TextField } from "@radix-ui/themes";
import {
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
} from "@/app/__generated__/hooks";

export function UserSettingsLanguageSelector() {
  const { data, loading } = useGetUserSettingsQuery();
  const [updateUserSettings, { loading: updating }] =
    useUpdateUserSettingsMutation({
      refetchQueries: ["GetUserSettings"],
    });

  const currentLanguage = data?.userSettings?.storyLanguage ?? "English";
  const currentMinutes = data?.userSettings?.storyMinutes ?? 10;

  const [localMinutes, setLocalMinutes] = useState(String(currentMinutes));

  useEffect(() => {
    setLocalMinutes(String(currentMinutes));
  }, [currentMinutes]);

  const handleLanguageChange = (lang: string) => {
    updateUserSettings({ variables: { storyLanguage: lang, storyMinutes: currentMinutes } });
  };

  const commitMinutes = () => {
    const val = parseInt(localMinutes, 10);
    if (!isNaN(val) && val > 0 && val !== currentMinutes) {
      updateUserSettings({ variables: { storyLanguage: currentLanguage, storyMinutes: val } });
    } else {
      setLocalMinutes(String(currentMinutes));
    }
  };

  return (
    <Flex align="center" gap="3">
      <Flex align="center" gap="2">
        <Text size="2" color="gray" weight="medium">
          Language
        </Text>
        <Select.Root
          value={currentLanguage}
          onValueChange={handleLanguageChange}
          disabled={loading || updating}
          size="1"
        >
          <Select.Trigger />
          <Select.Content>
            <Select.Item value="Romanian">Romanian</Select.Item>
            <Select.Item value="English">English</Select.Item>
            <Select.Item value="French">French</Select.Item>
            <Select.Item value="German">German</Select.Item>
            <Select.Item value="Spanish">Spanish</Select.Item>
          </Select.Content>
        </Select.Root>
      </Flex>
      <Flex align="center" gap="2">
        <Text size="2" color="gray" weight="medium">
          Minutes
        </Text>
        <TextField.Root
          type="number"
          value={localMinutes}
          onChange={(e) => setLocalMinutes(e.target.value)}
          onBlur={commitMinutes}
          onKeyDown={(e) => { if (e.key === "Enter") commitMinutes(); }}
          disabled={loading || updating}
          size="1"
          min="1"
          max="60"
          style={{ width: 64 }}
        />
      </Flex>
    </Flex>
  );
}
