import { cva } from "styled-system/css";

export const dataList = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  variants: {
    variant: {
      default: {},
      bordered: {
        border: "1px solid",
        borderColor: "ui.border",
        borderRadius: "lg",
        overflow: "hidden",
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export const dataListItem = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "4",
    py: "3",
    px: "0",
    borderBottom: "1px solid",
    borderBottomColor: "ui.border",
    _last: {
      borderBottom: "none",
    },
  },
  variants: {
    variant: {
      default: {},
      bordered: {
        px: "4",
      },
    },
    compact: {
      true: {
        py: "2",
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export const dataListLabel = cva({
  base: {
    fontSize: "sm",
    color: "ui.tertiary",
    fontWeight: "normal",
    flexShrink: 0,
    minWidth: "120px",
  },
});

export const dataListValue = cva({
  base: {
    fontSize: "sm",
    color: "ui.heading",
    fontWeight: "medium",
    textAlign: "right",
    flex: 1,
  },
});

export const keyValue = cva({
  base: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: "2",
  },
  variants: {
    orientation: {
      horizontal: {
        flexDirection: "row",
      },
      vertical: {
        flexDirection: "column",
        gap: "0.5",
      },
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

export const keyValueKey = cva({
  base: {
    fontSize: "2xs",
    color: "ui.dim",
    fontWeight: "medium",
    letterSpacing: "editorial",
    textTransform: "uppercase",
  },
});

export const keyValueValue = cva({
  base: {
    fontSize: "sm",
    color: "ui.heading",
    fontWeight: "medium",
  },
});
