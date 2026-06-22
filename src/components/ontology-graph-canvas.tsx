"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
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
  const [sizeScale, setSizeScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // 브라우저 전체화면 상태 동기화 (ESC 등으로 종료될 때 포함)
  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  }, []);

  const graphData = useMemo(
    () => computeVisibleGraph(graph, expanded),
    [graph, expanded],
  );

  // 노드 크기 배율이 바뀌면 지오메트리를 즉시 다시 그린다.
  useEffect(() => {
    fgRef.current?.refresh?.();
  }, [sizeScale]);

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
      // 클릭한 노드를 항상 화면 중앙으로 가져온다.
      focusNode(node);

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
        // 확장된 자식 배치가 반영된 뒤 다시 한 번 중앙 정렬
        window.setTimeout(() => focusNode(node), 250);
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
    // 라벨을 노드 구체 위쪽에 배치 (구체 반지름 ∝ nodeVal^(1/3))
    const radius = Math.cbrt(LEVEL_SIZES[node.level] * sizeScale) * 4;
    sprite.position.set(0, radius + 2, 0);
    return sprite;
  }, [sizeScale]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-slate-200 backdrop-blur">
        <label htmlFor="node-size" className="font-semibold text-slate-100">
          노드 크기
        </label>
        <input
          id="node-size"
          type="range"
          min={1}
          max={300}
          step={1}
          value={Math.round(sizeScale * 100)}
          onChange={(e) => setSizeScale(Number(e.target.value) / 100)}
          className="h-1 w-28 cursor-pointer accent-sky-400"
          aria-label="노드 크기 조절"
        />
        <span className="w-10 tabular-nums text-slate-300">
          {Math.round(sizeScale * 100)}%
        </span>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="ml-1 inline-flex items-center justify-center rounded p-1 text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={isFullscreen ? "전체화면 종료" : "전체화면 보기"}
          title={isFullscreen ? "전체화면 종료" : "전체화면 보기"}
        >
          {isFullscreen ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
        </button>
      </div>
      <ForceGraph3D
        ref={fgRef}
        width={size.width}
        height={size.height}
        graphData={graphData}
        backgroundColor="#0b1120"
        showNavInfo={false}
        nodeId="id"
        nodeLabel={(node: GraphNode) => node.label}
        nodeVal={(node: GraphNode) => LEVEL_SIZES[node.level] * sizeScale}
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
