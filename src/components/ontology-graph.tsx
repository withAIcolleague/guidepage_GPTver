"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { OntologyLeafSelection } from "@/components/ontology-graph-canvas";

const OntologyGraphCanvas = dynamic(
  () => import("@/components/ontology-graph-canvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-300">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm">온톨로지 그래프를 불러오는 중...</p>
      </div>
    ),
  },
);

interface OntologyGraphProps {
  onSelectLeaf: (leaf: OntologyLeafSelection) => void;
}

export function OntologyGraph({ onSelectLeaf }: OntologyGraphProps) {
  return (
    <div className="relative h-[70vh] min-h-[480px] w-full overflow-hidden rounded-lg border border-border bg-[#0b1120]">
      <OntologyGraphCanvas onSelectLeaf={onSelectLeaf} />

      <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[11px] leading-5 text-slate-200 backdrop-blur">
        <div className="font-semibold text-slate-100">탐색 안내</div>
        <div className="text-slate-300">노드를 클릭해 하위 분류로 펼치세요</div>
        <div className="text-slate-300">도구·이론 노드를 누르면 미리보기가 열립니다</div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-200">
        {[
          { c: "#38bdf8", label: "대분류" },
          { c: "#34d399", label: "중분류" },
          { c: "#fbbf24", label: "세부분류" },
          { c: "#f472b6", label: "단계" },
          { c: "#94a3b8", label: "도구·이론" },
        ].map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 backdrop-blur"
          >
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: item.c }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
