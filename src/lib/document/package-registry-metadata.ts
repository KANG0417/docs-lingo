interface PackageRegistryLinks {
  homepage?: string;
  repository?: string;
}

interface NpmRegistryResponse {
  "dist-tags"?: {
    latest?: string;
  };
  versions?: Record<
    string,
    {
      homepage?: string;
      repository?:
        | string
        | {
            url?: string;
          };
    }
  >;
}

interface PypiRegistryResponse {
  info?: {
    home_page?: string;
    project_urls?: Record<string, string>;
    package_url?: string;
  };
}

const REGISTRY_FETCH_TIMEOUT_MS = 5000;

const fetchWithTimeout = async (url: string): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REGISTRY_FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const fetchNpmPackageLinks = async (
  packageName: string,
): Promise<PackageRegistryLinks | null> => {
  try {
    const response = await fetchWithTimeout(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}`,
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as NpmRegistryResponse;
    const latestVersion = data["dist-tags"]?.latest;
    const versionMeta = latestVersion ? data.versions?.[latestVersion] : undefined;

    if (!versionMeta) {
      return null;
    }

    const repository =
      typeof versionMeta.repository === "string"
        ? versionMeta.repository
        : versionMeta.repository?.url;

    return {
      homepage: versionMeta.homepage,
      repository,
    };
  } catch {
    return null;
  }
};

export const fetchPypiPackageLinks = async (
  packageName: string,
): Promise<PackageRegistryLinks | null> => {
  try {
    const response = await fetchWithTimeout(
      `https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`,
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as PypiRegistryResponse;
    const projectUrls = data.info?.project_urls ?? {};
    const documentationUrl =
      projectUrls.Documentation ??
      projectUrls.documentation ??
      projectUrls.Homepage ??
      projectUrls.homepage;

    return {
      homepage: data.info?.home_page ?? documentationUrl,
      repository:
        projectUrls.Repository ??
        projectUrls.repository ??
        projectUrls.Source ??
        projectUrls.source,
    };
  } catch {
    return null;
  }
};

export const buildPackageNameCandidates = (hostname: string): string[] => {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, "");
  const withoutDocs = normalizedHost.replace(/^docs\./, "");
  const baseLabel = withoutDocs.split(".")[0] ?? "";

  const candidates = new Set<string>();

  if (baseLabel) {
    candidates.add(baseLabel);

    if (baseLabel.endsWith("js")) {
      candidates.add(baseLabel.slice(0, -2));
    }

    if (baseLabel.includes("-")) {
      candidates.add(baseLabel.replace(/-/g, ""));
    }
  }

  return [...candidates].filter((candidate) => candidate.length >= 2);
};
