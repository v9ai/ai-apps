export function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case "high":
      return "red" as const;
    case "medium":
      return "orange" as const;
    case "low":
      return "green" as const;
    default:
      return "gray" as const;
  }
}

export function getCategoryColor(category: string) {
  switch (category.toLowerCase()) {
    case "academic":
      return "blue" as const;
    case "behavioral":
      return "orange" as const;
    case "social":
      return "purple" as const;
    case "emotional":
      return "pink" as const;
    case "developmental":
      return "cyan" as const;
    case "health":
      return "red" as const;
    case "communication":
      return "yellow" as const;
    default:
      return "gray" as const;
  }
}
