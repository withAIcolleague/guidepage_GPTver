import { workflowCategories } from "@/data/workflow-categories";
import { workflowChains, type WorkflowChain } from "@/data/quick-links";

export type OntologyLevel =
  | "root"
  | "category"
  | "section"
  | "chain"
  | "step"
  | "leaf";

export interface OntologyNode {
  id: string;
  label: string;
  level: OntologyLevel;
  parentId: string | null;
  childIds: string[];
  /** leaf 전용: 미리보기에 사용할 URL/제목 */
  url?: string;
  title?: string;
  /** leaf 종류 (도구 / 이론) */
  leafKind?: "tool" | "theory";
}

export interface OntologyGraphData {
  nodes: OntologyNode[];
  /** id로 빠르게 노드를 찾기 위한 맵 */
  byId: Record<string, OntologyNode>;
  rootId: string;
}

export const ROOT_ID = "root";

function chainById(chainId: string): WorkflowChain | null {
  return workflowChains.find((chain) => chain.id === chainId) ?? null;
}

/**
 * workflowCategories + workflowChains 를 단일 온톨로지 트리로 변환한다.
 * 계층: root → category → section → chain → step → leaf(tool/theory)
 */
export function buildOntologyGraph(): OntologyGraphData {
  const nodes: OntologyNode[] = [];
  const byId: Record<string, OntologyNode> = {};

  const addNode = (node: OntologyNode) => {
    nodes.push(node);
    byId[node.id] = node;
    if (node.parentId && byId[node.parentId]) {
      byId[node.parentId].childIds.push(node.id);
    }
    return node;
  };

  addNode({
    id: ROOT_ID,
    label: "지식 온톨로지",
    level: "root",
    parentId: null,
    childIds: [],
  });

  for (const category of workflowCategories) {
    const categoryId = `cat:${category.id}`;
    addNode({
      id: categoryId,
      label: `${category.icon} ${category.name}`,
      level: "category",
      parentId: ROOT_ID,
      childIds: [],
    });

    for (const section of category.sections) {
      const realChains = section.chainIds
        .map((chainId) => chainById(chainId))
        .filter((chain): chain is WorkflowChain => Boolean(chain));

      // 콘텐츠가 없는 중분류는 그래프에서 생략한다.
      if (realChains.length === 0) continue;

      const sectionId = `sec:${category.id}:${section.id}`;
      addNode({
        id: sectionId,
        label: section.name,
        level: "section",
        parentId: categoryId,
        childIds: [],
      });

      for (const chain of realChains) {
        const chainNodeId = `chain:${section.id}:${chain.id}`;
        addNode({
          id: chainNodeId,
          label: `${chain.icon} ${chain.name}`,
          level: "chain",
          parentId: sectionId,
          childIds: [],
        });

        chain.nodes.forEach((step, stepIndex) => {
          const stepId = `step:${chain.id}:${stepIndex}`;
          addNode({
            id: stepId,
            label: step.role,
            level: "step",
            parentId: chainNodeId,
            childIds: [],
          });

          if (step.theoryUrl) {
            addNode({
              id: `${stepId}:theory`,
              label: "이론 / 개념",
              level: "leaf",
              parentId: stepId,
              childIds: [],
              url: step.theoryUrl,
              title: `${step.role} - 이론`,
              leafKind: "theory",
            });
          }

          step.tools.forEach((tool, toolIndex) => {
            addNode({
              id: `${stepId}:tool:${toolIndex}`,
              label: tool.name,
              level: "leaf",
              parentId: stepId,
              childIds: [],
              url: tool.url,
              title: tool.name,
              leafKind: "tool",
            });
          });
        });
      }
    }
  }

  return { nodes, byId, rootId: ROOT_ID };
}

/** 펼쳐진(expanded) 노드 집합을 기준으로 현재 보여줄 노드/링크를 계산 */
export function computeVisibleGraph(
  graph: OntologyGraphData,
  expanded: Set<string>,
) {
  const visibleIds = new Set<string>([graph.rootId]);
  const queue: string[] = [graph.rootId];

  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (!expanded.has(id)) continue;
    for (const childId of graph.byId[id]?.childIds ?? []) {
      if (!visibleIds.has(childId)) {
        visibleIds.add(childId);
        queue.push(childId);
      }
    }
  }

  const nodes = Array.from(visibleIds).map((id) => graph.byId[id]);
  const links: { source: string; target: string }[] = [];

  for (const id of visibleIds) {
    const node = graph.byId[id];
    if (node?.parentId && visibleIds.has(node.parentId)) {
      links.push({ source: node.parentId, target: id });
    }
  }

  return { nodes, links };
}

/** 레벨별 색상 (3D 캔버스 전용 팔레트) */
export const LEVEL_COLORS: Record<OntologyLevel, string> = {
  root: "#f8fafc",
  category: "#38bdf8",
  section: "#34d399",
  chain: "#fbbf24",
  step: "#f472b6",
  leaf: "#94a3b8",
};

/** 레벨별 노드 크기 */
export const LEVEL_SIZES: Record<OntologyLevel, number> = {
  root: 4,
  category: 2.5,
  section: 1.8,
  chain: 1.4,
  step: 1,
  leaf: 0.6,
};
