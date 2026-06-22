"use client";

import { ChevronLeft, Layers } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BannerGrid } from "@/components/banner-grid";
import { Button } from "@/components/ui/button";
import { PreviewPanel } from "@/components/preview-panel";
import { WorkflowCanvas } from "@/components/workflow-canvas";
import { WorkflowChainTabs } from "@/components/workflow-chain-tabs";
import { WorkflowDetailPanel } from "@/components/workflow-detail-panel";
import { WorkflowSearch } from "@/components/workflow-search";
import { WorkflowSearchResults } from "@/components/workflow-search-results";
import type { SelectedWorkflowItem, WorkflowSearchResult } from "@/components/workflow-types";
import {
  workflowCategories,
  type WorkflowCategory,
  type WorkflowCategorySection,
} from "@/data/workflow-categories";
import { workflowChains, type FlowNode, type WorkflowChain } from "@/data/quick-links";

const normalize = (value: string) => value.trim().toLowerCase();

function chainById(chainId: string) {
  return workflowChains.find((chain) => chain.id === chainId) ?? null;
}

function chainsForSection(section: WorkflowCategorySection | null) {
  if (!section) return [];
  return section.chainIds
    .map((chainId) => chainById(chainId))
    .filter((chain): chain is WorkflowChain => Boolean(chain));
}

function chainsForCategory(category: WorkflowCategory | null) {
  if (!category) return [];
  return category.sections.flatMap((section) => chainsForSection(section));
}

function sectionsWithChains(category: WorkflowCategory) {
  return category.sections.filter((section) => chainsForSection(section).length > 0);
}

function findNode(chainId: string, nodeRole: string) {
  return chainById(chainId)?.nodes.find((node) => node.role === nodeRole);
}

function findTaxonomyByChain(chainId: string) {
  for (const category of workflowCategories) {
    for (const section of category.sections) {
      if (section.chainIds.includes(chainId)) {
        return { category, section };
      }
    }
  }

  return null;
}

function countNodes(chains: WorkflowChain[]) {
  return chains.reduce((count, chain) => count + chain.nodes.length, 0);
}

function countTools(chains: WorkflowChain[]) {
  return chains.reduce(
    (count, chain) =>
      count + chain.nodes.reduce((nodeCount, node) => nodeCount + node.tools.length, 0),
    0,
  );
}

interface QuickLinksSectionProps {
  onDetailModeChange?: (isDetailMode: boolean) => void;
}

export function QuickLinksSection({ onDetailModeChange }: QuickLinksSectionProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activeChainId, setActiveChainId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedWorkflowItem | null>(null);
  const [query, setQuery] = useState("");

  const activeCategory =
    workflowCategories.find((category) => category.id === activeCategoryId) ?? null;
  const activeSection =
    activeCategory?.sections.find((section) => section.id === activeSectionId) ?? null;
  const sectionChains = chainsForSection(activeSection);
  const activeChain =
    sectionChains.find((chain) => chain.id === activeChainId) ?? null;
  const detailMode = Boolean(activeCategory);
  const selectedNode = selectedItem
    ? (findNode(selectedItem.chainId, selectedItem.nodeRole) ?? null)
    : null;
  const selectedUrl =
    selectedItem && selectedNode
      ? selectedItem.mode === "theory"
        ? selectedNode.theoryUrl
        : selectedNode.tools[selectedItem.toolIndex ?? 0]?.url
      : undefined;
  const selectedTitle =
    selectedItem && selectedNode
      ? selectedItem.mode === "theory"
        ? `${selectedNode.role} - 이론`
        : selectedNode.tools[selectedItem.toolIndex ?? 0]?.name
      : undefined;
  const previewOpen = Boolean(selectedUrl && selectedTitle);
  const hasSearchQuery = query.trim().length > 0;

  useEffect(() => {
    onDetailModeChange?.(detailMode);
    return () => onDetailModeChange?.(false);
  }, [detailMode, onDetailModeChange]);

  const totalNodes = countNodes(workflowChains);
  const totalTools = countTools(workflowChains);

  const searchResults = useMemo<WorkflowSearchResult[]>(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return [];

    return workflowCategories.flatMap((category) =>
      category.sections.flatMap((section) =>
        section.chainIds.flatMap((chainId) => {
          const chain = chainById(chainId);
          if (!chain) return [];

          return chain.nodes.flatMap((node) =>
            node.tools.flatMap((tool, toolIndex) => {
              const haystack = normalize(
                [
                  category.name,
                  category.description,
                  section.name,
                  section.description,
                  chain.name,
                  chain.description,
                  node.role,
                  node.searchQuery ?? "",
                  tool.name,
                  tool.url,
                ].join(" "),
              );

              return haystack.includes(normalizedQuery)
                ? [{ category, section, chain, node, toolIndex }]
                : [];
            }),
          );
        }),
      ),
    );
  }, [query]);

  const openCategory = (category: WorkflowCategory) => {
    if (chainsForCategory(category).length === 0) return;

    setActiveCategoryId(category.id);
    setActiveSectionId(null);
    setActiveChainId(null);
    setSelectedItem(null);
    setQuery("");
  };

  const selectSection = (section: WorkflowCategorySection) => {
    if (chainsForSection(section).length === 0) return;

    setActiveSectionId(section.id);
    setActiveChainId(null);
    setSelectedItem(null);
  };

  const selectChain = (chainId: string) => {
    setActiveChainId(chainId);
    setSelectedItem(null);
  };

  const selectNode = (chainId: string, node: FlowNode) => {
    setActiveChainId(chainId);
    setSelectedItem({
      chainId,
      nodeRole: node.role,
      mode: node.theoryUrl ? "theory" : "tool",
      toolIndex: node.theoryUrl ? undefined : 0,
    });
  };

  const selectTool = (chainId: string, node: FlowNode, toolIndex: number) => {
    const taxonomy = findTaxonomyByChain(chainId);

    setActiveCategoryId(taxonomy?.category.id ?? activeCategoryId);
    setActiveSectionId(taxonomy?.section.id ?? activeSectionId);
    setActiveChainId(chainId);
    setSelectedItem({
      chainId,
      nodeRole: node.role,
      mode: "tool",
      toolIndex,
    });
  };

  const selectSearchResult = (result: WorkflowSearchResult) => {
    setActiveCategoryId(result.category.id);
    setActiveSectionId(result.section.id);
    setActiveChainId(result.chain.id);
    setSelectedItem({
      chainId: result.chain.id,
      nodeRole: result.node.role,
      mode: "tool",
      toolIndex: result.toolIndex,
    });
    setQuery("");
  };

  const resetToCategories = () => {
    setActiveCategoryId(null);
    setActiveSectionId(null);
    setActiveChainId(null);
    setSelectedItem(null);
    setQuery("");
  };

  return (
    <section
      id="workflow"
      className={`relative w-full px-4 sm:px-6 ${
        detailMode ? "min-h-screen pb-6 pt-3" : "pb-16 pt-6"
      }`}
    >
      <div className="absolute inset-0 bg-background" />

      <div className="relative mx-auto max-w-[830px]">
        {!detailMode && (
          <>
            <div className="grid gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <Badge variant="outline" className="mb-2 bg-background px-2 py-0 text-[11px] text-muted-foreground">
                  Knowledge Dashboard
                </Badge>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  NEXINOUS 워크플로우 맵
                </h1>
                <p className="mt-1.5 max-w-3xl text-sm leading-5 text-muted-foreground">
                  대분류에서 중분류, 세부분류, 작업 흐름, 실행 도구 순서로 지식
                  맥락을 좁혀갑니다.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center sm:min-w-72">
                <div className="rounded-md border border-border bg-background px-3 py-1.5">
                  <div className="text-base font-semibold">{workflowCategories.length}</div>
                  <div className="text-[11px] text-muted-foreground">대분류</div>
                </div>
                <div className="rounded-md border border-border bg-background px-3 py-1.5">
                  <div className="text-base font-semibold">{totalNodes}</div>
                  <div className="text-[11px] text-muted-foreground">단계</div>
                </div>
                <div className="rounded-md border border-border bg-background px-3 py-1.5">
                  <div className="text-base font-semibold">{totalTools}</div>
                  <div className="text-[11px] text-muted-foreground">도구</div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <BannerGrid />
            </div>

            <div className="mt-4">
              <WorkflowSearch
                query={query}
                results={searchResults}
                onQueryChange={setQuery}
                onClear={() => setQuery("")}
                onSelectResult={selectSearchResult}
              />
            </div>
          </>
        )}

        {!activeCategory ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {workflowCategories.map((category) => {
              const chains = chainsForCategory(category);
              const readySections = sectionsWithChains(category);
              const hasChains = chains.length > 0;
              const nodeCount = countNodes(chains);

              return (
                <button
                  key={category.id}
                  type="button"
                  disabled={!hasChains}
                  onClick={() => openCategory(category)}
                  className={`group rounded-lg border border-border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    hasChains
                      ? "bg-card hover:border-foreground/20 hover:bg-muted/40"
                      : "cursor-not-allowed bg-muted/40 text-muted-foreground opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-2xl" aria-hidden="true">
                      {category.icon}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                      {hasChains ? `${readySections.length}개 중분류` : "준비 중"}
                    </span>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold tracking-tight">
                    {category.name}
                  </h2>
                  <p className="mt-2 min-h-16 text-sm leading-6 text-muted-foreground">
                    {category.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Layers className="size-3.5" />
                    <span>
                      {hasChains
                        ? `${chains.length}개 세부분류 / ${nodeCount}개 단계`
                        : "분류 기준 먼저 확보"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,50vw)] lg:items-start">
            <div className="min-w-0">
            <div className="mb-4 rounded-lg border border-border bg-card p-3 shadow-sm">
              <div className="mb-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mb-2 h-8 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                  onClick={resetToCategories}
                >
                  <ChevronLeft className="size-4" />
                  대분류로 돌아가기
                </Button>
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  대분류
                </div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  {activeCategory.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeCategory.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="rounded-md border border-border bg-background px-2 py-1">
                    1 대분류: {activeCategory.name}
                  </span>
                  <span aria-hidden="true">/</span>
                  <span
                    className={`rounded-md border px-2 py-1 ${
                      activeSection
                        ? "border-border bg-background text-foreground"
                        : "border-dashed border-border bg-muted/40"
                    }`}
                  >
                    2 중분류: {activeSection?.name ?? "선택 필요"}
                  </span>
                  <span aria-hidden="true">/</span>
                  <span
                    className={`rounded-md border px-2 py-1 ${
                      activeChain
                        ? "border-border bg-background text-foreground"
                        : "border-dashed border-border bg-muted/40"
                    }`}
                  >
                    3 세부분류: {activeChain?.name ?? "선택 필요"}
                  </span>
                </div>
              </div>

              <WorkflowSearch
                compact
                query={query}
                results={searchResults}
                onQueryChange={setQuery}
                onClear={() => setQuery("")}
                onSelectResult={selectSearchResult}
                showResults={false}
              />
            </div>

            <div className="mb-4">
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                중분류
              </div>
              <div className="grid items-stretch gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {activeCategory.sections.map((section) => {
                  const chains = chainsForSection(section);
                  const hasChains = chains.length > 0;
                  const active = activeSection?.id === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      disabled={!hasChains}
                      onClick={() => selectSection(section)}
                      className={`min-h-28 rounded-lg border p-3 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        active
                          ? "border-foreground/30 bg-foreground text-background"
                          : hasChains
                            ? "border-border bg-card hover:border-foreground/20 hover:bg-muted/40"
                            : "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-75"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">{section.name}</h3>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] ${
                            active
                              ? "bg-background/15 text-background/80"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {active
                            ? "선택됨"
                            : hasChains
                              ? `${chains.length}개 세부분류`
                              : "준비 중"}
                        </span>
                      </div>
                      <p className={`mt-2 text-xs leading-5 ${active ? "text-background/75" : "text-muted-foreground"}`}>
                        {section.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeSection && sectionChains.length > 0 ? (
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    세부분류
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {activeSection.name}
                  </div>
                </div>
                <WorkflowChainTabs
                  chains={sectionChains}
                  activeChainId={activeChain?.id ?? ""}
                  onSelectChain={selectChain}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                중분류를 선택하면 그 안의 세부분류와 워크플로우를 확인할 수 있습니다.
              </div>
            )}

            {activeSection && !activeChain && sectionChains.length > 0 && (
              <div className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                세부분류를 선택하면 워크플로우 단계와 관련 도구가 표시됩니다.
              </div>
            )}

            {activeChain && (
              <div>
                <WorkflowCanvas
                  chain={activeChain}
                  selectedItem={selectedItem}
                  onSelectNode={(node) => selectNode(activeChain.id, node)}
                  onSelectTool={(node, toolIndex) =>
                    selectTool(activeChain.id, node, toolIndex)
                  }
                />
              </div>
            )}
            </div>

            <aside className="space-y-3 lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] lg:overflow-y-auto">
              {hasSearchQuery ? (
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3">
                    <div className="text-xs font-medium uppercase text-muted-foreground">
                      맥락 검색
                    </div>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight">
                      오른쪽 결과 패널
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      현재 입력한 검색어와 연결되는 세부분류, 단계, 도구를 이 영역에서 확인합니다.
                    </p>
                  </div>
                  <WorkflowSearchResults
                    results={searchResults}
                    onSelectResult={selectSearchResult}
                  />
                </div>
              ) : activeChain ? (
                <>
                  <WorkflowDetailPanel
                    chain={activeChain}
                    selectedItem={selectedItem}
                    selectedNode={selectedNode}
                    onSelectTheory={(node) => selectNode(activeChain.id, node)}
                    onSelectTool={(node, toolIndex) =>
                      selectTool(activeChain.id, node, toolIndex)
                    }
                    sticky={false}
                  />

                  {selectedUrl && selectedTitle && (
                    <PreviewPanel
                      url={selectedUrl}
                      title={selectedTitle}
                      isOpen={previewOpen}
                      mode="embedded"
                      onClose={() => setSelectedItem(null)}
                    />
                  )}
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
                  <div className="text-xs font-medium uppercase">분류 기준</div>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                    {activeSection?.name ?? activeCategory.name}
                  </h2>
                  <p className="mt-2 leading-6">
                    왼쪽에서 중분류와 세부분류를 선택하면 이 영역이 검색 결과, 이론,
                    도구 미리보기 패널로 전환됩니다.
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
