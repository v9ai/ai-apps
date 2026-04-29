"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Flex,
  Heading,
  Table,
  Text,
  TextField,
} from "@radix-ui/themes";
import {
  useAddVehicleServiceRecordMutation,
  useDeleteVehicleServiceRecordMutation,
  VehicleDocument,
} from "../../__generated__/hooks";

export interface ServiceRecordView {
  id: string;
  type: string;
  serviceDate: string;
  odometerMiles?: number | null;
  costCents?: number | null;
  vendor?: string | null;
  notes?: string | null;
}

function formatCost(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(d: string): string {
  return d.slice(0, 10);
}

export function ServiceLog({
  vehicleId,
  vehicleSlug,
  records,
}: {
  vehicleId: string;
  vehicleSlug: string;
  records: ServiceRecordView[];
}) {
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const refetch = [
    { query: VehicleDocument, variables: { slug: vehicleSlug } },
  ];

  const [addRecord, { loading: adding }] =
    useAddVehicleServiceRecordMutation({ refetchQueries: refetch });
  const [deleteRecord] = useDeleteVehicleServiceRecordMutation({
    refetchQueries: refetch,
  });

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const type = String(fd.get("type") ?? "").trim();
    const dateStr = String(fd.get("serviceDate") ?? "").trim();
    if (!type || !dateStr) {
      setError("Type and date are required");
      return;
    }
    const odo = String(fd.get("odometerMiles") ?? "").trim();
    const cost = String(fd.get("costCents") ?? "").trim();
    try {
      await addRecord({
        variables: {
          input: {
            vehicleId,
            type,
            serviceDate: new Date(dateStr).toISOString(),
            odometerMiles: odo ? Number.parseInt(odo, 10) : null,
            costCents: cost ? Number.parseInt(cost, 10) : null,
            vendor:
              (String(fd.get("vendor") ?? "").trim() || null) as string | null,
            notes:
              (String(fd.get("notes") ?? "").trim() || null) as string | null,
          },
        },
      });
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add record");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this service record?")) return;
    setError("");
    setDeletingId(id);
    try {
      await deleteRecord({ variables: { id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete record");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Flex direction="column" gap="4">
      <Heading size="4">Service log</Heading>

      {records.length === 0 ? (
        <Text size="2" color="gray">
          No service records yet.
        </Text>
      ) : (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Miles</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Cost</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Vendor</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Notes</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {records.map((r) => (
              <Table.Row key={r.id}>
                <Table.Cell>{formatDate(r.serviceDate)}</Table.Cell>
                <Table.Cell>{r.type}</Table.Cell>
                <Table.Cell>{r.odometerMiles ?? "—"}</Table.Cell>
                <Table.Cell>{formatCost(r.costCents)}</Table.Cell>
                <Table.Cell>{r.vendor ?? "—"}</Table.Cell>
                <Table.Cell>{r.notes ?? ""}</Table.Cell>
                <Table.Cell>
                  <Button
                    size="1"
                    variant="soft"
                    color="red"
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                  >
                    {deletingId === r.id ? "…" : "Delete"}
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      <Card size="2">
        <form onSubmit={handleAdd}>
          <Flex direction="column" gap="3">
            <Heading size="3">Add service record</Heading>
            {error && (
              <Text size="2" color="red">
                {error}
              </Text>
            )}
            <Flex gap="3" wrap="wrap">
              <Flex
                direction="column"
                gap="1"
                style={{ flex: 1, minWidth: 160 }}
              >
                <Text as="label" size="2">
                  Type
                </Text>
                <TextField.Root
                  name="type"
                  placeholder="Oil change"
                  required
                />
              </Flex>
              <Flex
                direction="column"
                gap="1"
                style={{ flex: 1, minWidth: 160 }}
              >
                <Text as="label" size="2">
                  Date
                </Text>
                <TextField.Root
                  name="serviceDate"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                />
              </Flex>
              <Flex
                direction="column"
                gap="1"
                style={{ flex: 1, minWidth: 120 }}
              >
                <Text as="label" size="2">
                  Miles
                </Text>
                <TextField.Root name="odometerMiles" type="number" min={0} />
              </Flex>
              <Flex
                direction="column"
                gap="1"
                style={{ flex: 1, minWidth: 120 }}
              >
                <Text as="label" size="2">
                  Cost (cents)
                </Text>
                <TextField.Root name="costCents" type="number" min={0} />
              </Flex>
              <Flex
                direction="column"
                gap="1"
                style={{ flex: 1, minWidth: 160 }}
              >
                <Text as="label" size="2">
                  Vendor
                </Text>
                <TextField.Root name="vendor" placeholder="Shop name" />
              </Flex>
            </Flex>
            <Flex direction="column" gap="1">
              <Text as="label" size="2">
                Notes
              </Text>
              <TextField.Root name="notes" placeholder="Optional" />
            </Flex>
            <Button type="submit" disabled={adding}>
              {adding ? "Adding…" : "Add record"}
            </Button>
          </Flex>
        </form>
      </Card>
    </Flex>
  );
}
