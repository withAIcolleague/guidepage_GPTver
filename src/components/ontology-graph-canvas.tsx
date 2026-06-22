"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import {
  buildOntologyGraph,
  computeVisibleGraph,
  LEVEL_COLORS,
  LEVEL_SIZES,
  ROOT_ID,
  type OntologyNode,
} from "@/lib/ontology-graph";

export interface OntologyLeafSelection {
  url: string;
  title: string;
}

interface OntologyGraphCanvasProps {
  onSelectLeaf: (leaf: OntologyLeafSelection) => void;
}

type GraphNode = OntologyNode & { x?: number; y?: number; z?: number };

export default function OntologyGraphCanvas({
  onSelectLeaf,
}: OntologyGraphCanvasProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graph = useMemo(() => buildOntologyGraph(), []);

  // 초기에는 root 만 펼쳐 대분류 노드들이 보이도록 한다.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([ROOT_ID]),
  );
  const [size, setSize] = useState({ width: 800, height: 560 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(
    () => computeVisibleGraph(graph, expanded),
    [graph, expanded],
  );

  const focusNode = useCallback((node: GraphNode) => {
    const fg = fgRef.current;
    if (!fg || node.x == null || node.y == null || node.z == null) return;
    const distance = 120;
    const hypot = Math.hypot(node.x, node.y, node.z) || 1;
    const ratio = 1 + distance / hypot;
    fg.cameraPosition(
      { x: node.x * ratio, y: node.y * ratio, z: node.z * ratio },
      { x: node.x, y: node.y, z: node.z },
      900,
    );
  }, []);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      // 최하위(도구/이론) → 미리보기 패널 열기
      if (node.level === "leaf") {
        if (node.url && node.title) {
          onSelectLeaf({ url: node.url, title: node.title });
        }
        return;
      }

      // 하위가 있는 노드 → 점진적 확장/축소 토글
      if (node.childIds.length > 0) {
        setExpanded((prev) => {
          const next = new Set(prev);
          if (next.has(node.id)) {
            next.delete(node.id);
          } else {
            next.add(node.id);
          }
          return next;
        });
        // 약간의 지연 후 카메라 포커스 (확장된 자식 배치 반영)
        window.setTimeout(() => focusNode(node), 120);
      }
    },
    [focusNode, onSelectLeaf],
  );

  const nodeThreeObject = useCallback((node: GraphNode) => {
    const sprite = new SpriteText(node.label);
    sprite.color = LEVEL_COLORS[node.level];
    sprite.textHeight =
      node.level === "root"
        ? 7
        : node.level === "category"
          ? 5
          : node.level === "leaf"
            ? 2.5
            : 3.5;
    sprite.fontFace = "sans-serif";
    sprite.fontWeight = node.level === "leaf" ? "400" : "600";
    // 라벨을 노드 구체 위쪽에 배치
    sprite.position.set(0, LEVEL_SIZES[node.level] + 3, 0);
    return sprite;
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full">
      <ForceGraph3D
        ref={fgRef}
        width={size.width}
        height={size.height}
        graphData={graphData}
        backgroundColor="#0b1120"
        showNavInfo={false}
        nodeId="id"
        nodeLabel={(node: GraphNode) => node.label}
        nodeVal={(node: GraphNode) => LEVEL_SIZES[node.level]}
        nodeColor={(node: GraphNode) => LEVEL_COLORS[node.level]}
        nodeOpacity={0.95}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend
        linkColor={() => "rgba(148, 163, 184, 0.35)"}
        linkWidth={0.6}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={1.4}
        linkDirectionalParticleSpeed={0.006}
        onNodeClick={handleNodeClick}
        enableNodeDrag={false}
        cooldownTicks={120}
      />
    </div>
  );
}
