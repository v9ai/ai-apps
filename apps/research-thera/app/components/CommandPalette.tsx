"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Box, Dialog, Flex, Kbd, Text, TextField, VisuallyHidden } from "@radix-ui/themes";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { flattenNav, NAV_ITEMS, type FlatNavItem } from "./nav-items";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 540, padding: 0, overflow: "hidden" }}>
        <VisuallyHidden>
          <Dialog.Title>Search pages</Dialog.Title>
          <Dialog.Description>
            Type to filter pages, then press Enter to open.
          </Dialog.Description>
        </VisuallyHidden>
        <PaletteBody onClose={() => onOpenChange(false)} />
      </Dialog.Content>
    </Dialog.Root>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allItems = useMemo(() => flattenNav(NAV_ITEMS), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((it) => {
      const label = it.label.toLowerCase();
      const group = (it.group ?? "").toLowerCase();
      return label.includes(q) || group.includes(q);
    });
  }, [allItems, query]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-idx="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleSelect = (item: FlatNavItem) => {
    onClose();
    router.push(item.href);
  };

  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setActiveIndex(0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) handleSelect(item);
    }
  };

  return (
    <>
      <Box px="3" py="2" style={{ borderBottom: "1px solid var(--gray-a4)" }}>
        <TextField.Root
          ref={inputRef}
          size="3"
          variant="soft"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          placeholder="Search pages…"
          color="gray"
          style={{ background: "transparent", boxShadow: "none" }}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>
      </Box>

      <Box
        ref={listRef}
        style={{ maxHeight: 360, overflowY: "auto", padding: "4px 0" }}
      >
        {filtered.length === 0 ? (
          <Flex p="4" justify="center">
            <Text color="gray" size="2">
              No matches
            </Text>
          </Flex>
        ) : (
          filtered.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <Flex
                key={item.href}
                data-cmd-idx={idx}
                align="center"
                justify="between"
                px="4"
                py="2"
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(item)}
                style={{
                  cursor: "pointer",
                  background: isActive ? "var(--indigo-a3)" : undefined,
                  color: isActive ? "var(--indigo-12)" : undefined,
                }}
              >
                <Text size="2">{item.label}</Text>
                {item.group && (
                  <Text size="1" color="gray">
                    {item.group}
                  </Text>
                )}
              </Flex>
            );
          })
        )}
      </Box>

      <Flex
        align="center"
        gap="4"
        px="4"
        py="2"
        style={{
          borderTop: "1px solid var(--gray-a4)",
          background: "var(--gray-a2)",
        }}
      >
        <Flex align="center" gap="1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <Text size="1" color="gray">
            navigate
          </Text>
        </Flex>
        <Flex align="center" gap="1">
          <Kbd>↵</Kbd>
          <Text size="1" color="gray">
            open
          </Text>
        </Flex>
        <Flex align="center" gap="1">
          <Kbd>esc</Kbd>
          <Text size="1" color="gray">
            close
          </Text>
        </Flex>
      </Flex>
    </>
  );
}
