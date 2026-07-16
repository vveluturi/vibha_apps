import { useEffect, useState } from "react";

const SETTINGS_KEY = "compass_settings_v1";
const SETTINGS_UPDATED_EVENT = "compass-settings-updated";

interface CompanyProfile {
  companyName: string;
  industry: string;
  companySize: string;
  missionStatement: string;
  logoUrl: string | null;
}

function loadCompanyProfile(): CompanyProfile {
  const empty: CompanyProfile = {
    companyName: "",
    industry: "",
    companySize: "",
    missionStatement: "",
    logoUrl: null,
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return { ...empty, ...(parsed?.company ?? {}) };
  } catch {
    return empty;
  }
}

// Settings persists to the same key independently — call this after saving
// so mounted components (e.g. the persistent Layout header) pick up the change
// without needing a full navigation/remount.
export function notifySettingsUpdated() {
  window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
}

export function companyInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "YC";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function useCompanyName(): string {
  const [name, setName] = useState(() => loadCompanyProfile().companyName);

  useEffect(() => {
    function handleUpdate() {
      setName(loadCompanyProfile().companyName);
    }
    window.addEventListener(SETTINGS_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return name.trim() || "Your Company";
}
