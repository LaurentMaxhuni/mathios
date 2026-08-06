"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowUpRight, Clock3, Search, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SearchPageData } from "@/features/search/service";
import { SEARCH_DOCUMENT_TYPES } from "@/domain/search/types";
import type { SearchDocumentType, SearchResult } from "@/domain/search/types";

const SUGGESTION_CACHE_LIMIT = 20;

interface SearchWorkspaceProps {
  initialData: SearchPageData;
}

export function SearchWorkspace({ initialData }: SearchWorkspaceProps) {
  const [query, setQuery] = React.useState(initialData.query.text);
  const [results, setResults] = React.useState(initialData.results);
  const [suggestions, setSuggestions] = React.useState(initialData.suggestions);
  const [recentSearches, setRecentSearches] = React.useState(initialData.recentSearches);
  const [facets] = React.useState(initialData.facets);
  const [types, setTypes] = React.useState<readonly string[]>(initialData.query.types ?? []);
  const [subjectId, setSubjectId] = React.useState(initialData.query.subjectIds?.[0] ?? "");
  const [gradeId, setGradeId] = React.useState(initialData.query.gradeIds?.[0] ?? "");
  const [curriculumId, setCurriculumId] = React.useState(
    initialData.query.curriculumIds?.[0] ?? "",
  );
  const [difficulty, setDifficulty] = React.useState(initialData.query.difficulties?.[0] ?? "");
  const [masteryState, setMasteryState] = React.useState(
    initialData.query.masteryStates?.[0] ?? "",
  );
  const [publicationStatus, setPublicationStatus] = React.useState(
    initialData.query.publicationStatuses?.[0] ?? "",
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const searchAbortRef = React.useRef<AbortController | null>(null);
  const suggestionAbortRef = React.useRef<AbortController | null>(null);
  const suggestionCacheRef = React.useRef(new Map<string, SearchPageData["suggestions"]>());

  const runSearch = React.useCallback(
    async (submittedQuery = query) => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setLoading(true);
      setError(null);
      setActiveIndex(-1);
      const params = new URLSearchParams();
      params.set("q", submittedQuery);
      if (types.length) params.set("types", types.join(","));
      if (subjectId) params.set("subjectId", subjectId);
      if (gradeId) params.set("gradeId", gradeId);
      if (curriculumId) params.set("curriculumId", curriculumId);
      if (difficulty) params.set("difficulty", difficulty);
      if (masteryState) params.set("mastery", masteryState);
      if (publicationStatus) params.set("publicationStatus", publicationStatus);
      try {
        const response = await fetch(`/api/search?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json()) as SearchPageData & { message?: string };
        if (!response.ok) throw new Error(data.message ?? "Search is unavailable.");
        setResults(data.results);
        setSuggestions(data.suggestions);
        setRecentSearches(data.recentSearches);
        window.history.replaceState(null, "", `/search?${params.toString()}`);
      } catch (searchError) {
        if (controller.signal.aborted) return;
        setError(searchError instanceof Error ? searchError.message : "Search is unavailable.");
      } finally {
        if (searchAbortRef.current === controller) {
          searchAbortRef.current = null;
          setLoading(false);
        }
      }
    },
    [curriculumId, difficulty, gradeId, masteryState, publicationStatus, query, subjectId, types],
  );

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    suggestionAbortRef.current?.abort();
    if (!query.trim()) {
      setSuggestions(initialData.suggestions);
      return;
    }
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const cached = suggestionCacheRef.current.get(normalizedQuery);
    if (cached) {
      setSuggestions(cached);
      return;
    }
    const controller = new AbortController();
    suggestionAbortRef.current = controller;
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null);
      if (!response?.ok) return;
      const data = (await response.json()) as { suggestions: SearchPageData["suggestions"] };
      if (suggestionCacheRef.current.size >= SUGGESTION_CACHE_LIMIT) {
        const oldest = suggestionCacheRef.current.keys().next().value;
        if (oldest) suggestionCacheRef.current.delete(oldest);
      }
      suggestionCacheRef.current.set(normalizedQuery, data.suggestions);
      setSuggestions(data.suggestions);
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      if (suggestionAbortRef.current === controller) suggestionAbortRef.current = null;
    };
  }, [initialData.suggestions, query]);

  React.useEffect(
    () => () => {
      searchAbortRef.current?.abort();
      suggestionAbortRef.current?.abort();
    },
    [],
  );

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      if (!results.length) return;
      event.preventDefault();
      setActiveIndex((current) => Math.min(results.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      if (!results.length) return;
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        window.location.assign(results[activeIndex].document.href ?? "/search");
      } else {
        void runSearch();
      }
    } else if (event.key === "Escape") {
      setQuery("");
      setSuggestions([]);
      setActiveIndex(-1);
    }
  };

  const toggleType = (type: SearchDocumentType) => {
    setTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  };

  const clearFilters = () => {
    setTypes([]);
    setSubjectId("");
    setGradeId("");
    setCurriculumId("");
    setDifficulty("");
    setMasteryState("");
    setPublicationStatus("");
  };

  return (
    <div className="space-y-7">
      <section className="surface-grid relative overflow-hidden rounded-2xl border bg-card px-5 py-7 shadow-soft sm:px-8">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Phase 13 · Local discovery</Badge>
            <span className="text-xs text-muted-foreground">
              Search works without an internet connection.
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Find the next idea.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Search lessons, concepts, practice, experiments, roadmaps, and your own knowledge base
            from one focused workspace.
          </p>
          <form
            className="mt-6 flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void runSearch();
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search the Mathios workspace…"
                aria-label="Global search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={Boolean(suggestions.length && query.trim())}
                aria-activedescendant={
                  activeIndex >= 0 && results[activeIndex]
                    ? `search-result-${results[activeIndex]?.document.id}`
                    : undefined
                }
                aria-controls="search-suggestions search-results"
                className="h-12 pl-11 pr-20 text-base"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-2 py-1 text-[0.68rem] text-muted-foreground sm:block">
                Ctrl K
              </kbd>
            </div>
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </Button>
          </form>
          {suggestions.length && query.trim() ? (
            <div
              id="search-suggestions"
              className="mt-2 flex flex-wrap gap-2"
              role="listbox"
              aria-label="Search suggestions"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.text}`}
                  type="button"
                  id={`search-suggestion-${index}`}
                  role="option"
                  aria-selected={false}
                  className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:border-accent hover:text-foreground"
                  onClick={() => {
                    setQuery(suggestion.text);
                    void runSearch(suggestion.text);
                  }}
                >
                  {suggestion.text}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Refine results</CardTitle>
                <CardDescription className="mt-1">Keep the signal close.</CardDescription>
              </div>
              <SlidersHorizontal className="h-4 w-4 text-accent" aria-hidden="true" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Content type
                </p>
                <div className="flex flex-wrap gap-2">
                  {SEARCH_DOCUMENT_TYPES.map((type) => {
                    const selected = types.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleType(type)}
                        className={`rounded-full border px-2.5 py-1 text-xs capitalize transition ${selected ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:border-accent hover:text-foreground"}`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
              <FilterSelect
                label="Subject"
                value={subjectId}
                onChange={setSubjectId}
                options={facets.subjects}
              />
              <FilterSelect
                label="Grade"
                value={gradeId}
                onChange={setGradeId}
                options={facets.grades}
              />
              <FilterSelect
                label="Curriculum"
                value={curriculumId}
                onChange={setCurriculumId}
                options={facets.curricula}
              />
              <FilterSelect
                label="Difficulty"
                value={difficulty}
                onChange={setDifficulty}
                options={facets.difficulties}
              />
              <FilterSelect
                label="Mastery"
                value={masteryState}
                onChange={setMasteryState}
                options={facets.masteryStates}
              />
              <FilterSelect
                label="Publication"
                value={publicationStatus}
                onChange={setPublicationStatus}
                options={facets.publicationStatuses}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={clearFilters}
              >
                <X className="h-4 w-4" aria-hidden="true" /> Clear filters
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" /> Recent searches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentSearches.length ? (
                recentSearches.map((recent) => (
                  <button
                    key={recent.id}
                    type="button"
                    className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      setQuery(recent.query);
                      void runSearch(recent.query);
                    }}
                  >
                    {recent.query}
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your recent searches will appear here.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>

        <section id="search-results" aria-live="polite" aria-atomic="false" aria-busy={loading}>
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Search results</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {query.trim()
                  ? `${results.length} matches for “${query}”`
                  : "Start with a question or phrase."}
              </h2>
            </div>
            {query.trim() ? (
              <span className="text-xs text-muted-foreground">
                Use ↑ ↓ and Enter to move quickly.
              </span>
            ) : null}
          </div>
          {error ? (
            <Card className="mt-5 border-destructive/40" role="alert">
              <CardContent className="py-7 text-sm text-destructive">{error}</CardContent>
            </Card>
          ) : null}
          {!error && query.trim() && !loading && !results.length ? (
            <Card className="mt-5">
              <CardContent className="py-12 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">Nothing matched yet.</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try fewer words, a different type, or clear a filter.
                </p>
              </CardContent>
            </Card>
          ) : null}
          {!query.trim() ? (
            <Card className="mt-5">
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Search across the entire learning workspace, including your private notes and
                  bookmarks.
                </p>
              </CardContent>
            </Card>
          ) : null}
          <div className="mt-5 space-y-3" role="listbox" aria-label="Search results">
            {results.map((result, index) => (
              <SearchResultCard
                key={result.document.id}
                result={result}
                active={index === activeIndex}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SearchResultCard({ result, active }: { result: SearchResult; active: boolean }) {
  const document = result.document;
  return (
    <Card
      id={`search-result-${document.id}`}
      className={
        active
          ? "border-accent ring-2 ring-accent/20"
          : "content-visibility-auto transition hover:-translate-y-0.5 hover:border-accent/50"
      }
      role="option"
      aria-selected={active}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge variant="outline" className="capitalize">
              {document.type}
            </Badge>
            <CardTitle className="mt-3 text-lg">
              <Link href={(document.href ?? "/search") as never} className="hover:text-accent">
                {document.title}
              </Link>
            </CardTitle>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        {result.highlights.map((highlight) => (
          <p key={highlight} className="line-clamp-3 text-sm leading-6 text-muted-foreground">
            {highlight}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string; count: number }[];
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.count})
          </option>
        ))}
      </select>
    </label>
  );
}
