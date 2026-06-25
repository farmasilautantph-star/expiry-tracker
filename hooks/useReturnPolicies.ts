"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface ReturnPolicy {
  id: number;
  supplier_id: string;
  supplier_name: string;
  brand: string;
  scope: string | null;
  address: string | null;
  contact_person: string | null;
  item_description: string | null;
  return_type: string;
  months_before_expiry: number | null;
  special_conditions: string | null;
  strict_supplier: boolean;
  last_updated: string | null;
  updated_by: string | null;
}

export interface ReturnPolicyStats {
  total: number;
  returnable: number;
  exchangeable: number;
  non_returnable: number;
  strict_suppliers: number;
  brand_linked: number;
  last_uploaded: string | null;
}

export type ReturnPolicyTypeFilter = "" | "RETURNABLE" | "EXCHANGEABLE" | "NON_RETURNABLE";

const EMPTY_STATS: ReturnPolicyStats = {
  total: 0,
  returnable: 0,
  exchangeable: 0,
  non_returnable: 0,
  strict_suppliers: 0,
  brand_linked: 0,
  last_uploaded: null,
};

export function useReturnPolicies() {
  const [policies, setPolicies] = useState<ReturnPolicy[]>([]);
  const [stats, setStats] = useState<ReturnPolicyStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ReturnPolicyTypeFilter>("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/return-policies", { credentials: "include" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load policies");
      setPolicies(json.data as ReturnPolicy[]);
      setStats(json.stats as ReturnPolicyStats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load policies");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return policies.filter((p) => {
      if (typeFilter && p.return_type !== typeFilter) return false;
      if (!q) return true;
      return (
        p.supplier_name.toLowerCase().includes(q) ||
        p.supplier_id.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.item_description ?? "").toLowerCase().includes(q) ||
        (p.contact_person ?? "").toLowerCase().includes(q)
      );
    });
  }, [policies, search, typeFilter]);

  return {
    policies: filtered,
    allPolicies: policies,
    stats,
    isLoading,
    error,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    refresh: fetchData,
  };
}
