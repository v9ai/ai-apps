"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Flex, Text } from "@radix-ui/themes";
import * as d3 from "d3";

type GraphNode = {
  id: string;
  label: string;
  group: string;
  strength?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  strength: number;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

const groupColor: Record<string, string> = {
  attacker: "#e5484d",
  defender: "#3e63dd",
  judge: "#f5a623",
  evidence: "#30a46c",
  unknown: "#8b8d98",
};

export function ArgumentGraph({ sessionId }: { sessionId: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/graph`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, [sessionId]);

  useEffect(() => {
    if (!data || !svgRef.current || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 680;
    const height = 420;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const simulation = d3
      .forceSimulation<GraphNode>(data.nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(data.links)
          .id((d) => d.id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Links
    const link = svg
      .append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", (d) => (d.type === "ATTACKS" ? "#e5484d" : "#30a46c"))
      .attr("stroke-width", (d) => Math.max(1, d.strength * 3))
      .attr("stroke-dasharray", (d) => (d.type === "ATTACKS" ? "6,3" : "none"))
      .attr("opacity", 0.6);

    // Nodes
    const node = svg
      .append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", 10)
      .attr("fill", (d) => groupColor[d.group] || groupColor.unknown)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call(
        d3
          .drag<SVGCircleElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any,
      );

    // Tooltips
    node.append("title").text((d) => d.label);

    // Labels
    const label = svg
      .append("g")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .text((d) => d.label.slice(0, 25))
      .attr("font-size", 9)
      .attr("dx", 14)
      .attr("dy", 4)
      .attr("fill", "var(--gray-11)");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x!)
        .attr("y1", (d) => (d.source as GraphNode).y!)
        .attr("x2", (d) => (d.target as GraphNode).x!)
        .attr("y2", (d) => (d.target as GraphNode).y!);

      node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
      label.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
    });

    return () => {
      simulation.stop();
    };
  }, [data]);

  if (error) {
    return (
      <Card>
        <Text size="2" color="gray">
          Could not load argument graph.
        </Text>
      </Card>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <Card>
        <Flex align="center" justify="center" py="6">
          <Text size="2" color="gray">
            {data ? "No argument graph data yet." : "Loading graph..."}
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Flex direction="column" gap="2">
        <Flex gap="3" wrap="wrap">
          {Object.entries(groupColor).filter(([k]) => k !== "unknown").map(([key, color]) => (
            <Flex key={key} gap="1" align="center">
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: color,
                }}
              />
              <Text size="1">{key}</Text>
            </Flex>
          ))}
          <Flex gap="1" align="center">
            <div style={{ width: 20, height: 2, backgroundColor: "#e5484d", borderTop: "2px dashed #e5484d" }} />
            <Text size="1">attacks</Text>
          </Flex>
          <Flex gap="1" align="center">
            <div style={{ width: 20, height: 2, backgroundColor: "#30a46c" }} />
            <Text size="1">supports</Text>
          </Flex>
        </Flex>
        <svg ref={svgRef} style={{ width: "100%", height: 420 }} />
      </Flex>
    </Card>
  );
}
