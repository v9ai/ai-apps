import Link from "next/link";
import { Card, Flex, Heading, Text } from "@radix-ui/themes";

export interface CarCardProps {
  id: string;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  thumbnailUrl?: string | null;
}

export function CarCard({ id, make, model, year, nickname, thumbnailUrl }: CarCardProps) {
  const title = nickname || `${year} ${make} ${model}`;
  const subtitle = nickname ? `${year} ${make} ${model}` : null;

  return (
    <Link href={`/cars/${id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <Card size="2">
        <Flex direction="column" gap="3">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={title} className="photo-thumb" />
          ) : (
            <div className="photo-thumb" />
          )}
          <Flex direction="column" gap="1">
            <Heading size="3">{title}</Heading>
            {subtitle && (
              <Text size="2" color="gray">
                {subtitle}
              </Text>
            )}
          </Flex>
        </Flex>
      </Card>
    </Link>
  );
}
