import {
  OFFICIAL_DOC_PATTERNS,
  OFFICIAL_DOCUMENT_ONLY_MESSAGE,
  UNOFFICIAL_DOC_INDICATORS,
} from "@/constants/official-document";
import {
  buildPackageNameCandidates,
  fetchNpmPackageLinks,
  fetchPypiPackageLinks,
} from "@/lib/document/package-registry-metadata";

export interface OfficialDocumentValidationResult {
  isOfficial: boolean;
  message: string;
}

const normalizeHostname = (hostname: string): string => {
  return hostname.toLowerCase().replace(/^www\./, "");
};

const extractHostnamesFromLink = (link: string): string[] => {
  try {
    const normalizedLink = link
      .trim()
      .replace(/^git\+/, "")
      .replace(/^git:\/\//, "https://")
      .replace(/^git@github\.com:/, "https://github.com/")
      .replace(/\.git$/i, "");

    const hostname = new URL(normalizedLink).hostname;
    return [normalizeHostname(hostname)];
  } catch {
    return [];
  }
};

const hostMatchesOfficialDomain = (
  inputHostname: string,
  officialHostname: string,
): boolean => {
  const normalizedInput = normalizeHostname(inputHostname);
  const normalizedOfficial = normalizeHostname(officialHostname);

  return (
    normalizedInput === normalizedOfficial ||
    normalizedInput.endsWith(`.${normalizedOfficial}`)
  );
};

const matchesAnyPattern = (value: string, patterns: RegExp[]): boolean => {
  return patterns.some((pattern) => pattern.test(value));
};

const collectOfficialHostnames = async (
  hostname: string,
): Promise<Set<string>> => {
  const officialHostnames = new Set<string>();
  const packageCandidates = buildPackageNameCandidates(hostname);

  await Promise.all(
    packageCandidates.flatMap((packageName) => [
      (async (): Promise<void> => {
        const npmLinks = await fetchNpmPackageLinks(packageName);
        if (!npmLinks) {
          return;
        }

        if (npmLinks.homepage) {
          extractHostnamesFromLink(npmLinks.homepage).forEach((host) => {
            officialHostnames.add(host);
          });
        }

        if (npmLinks.repository) {
          extractHostnamesFromLink(npmLinks.repository).forEach((host) => {
            officialHostnames.add(host);
          });
        }
      })(),
      (async (): Promise<void> => {
        const pypiLinks = await fetchPypiPackageLinks(packageName);
        if (!pypiLinks) {
          return;
        }

        if (pypiLinks.homepage) {
          extractHostnamesFromLink(pypiLinks.homepage).forEach((host) => {
            officialHostnames.add(host);
          });
        }

        if (pypiLinks.repository) {
          extractHostnamesFromLink(pypiLinks.repository).forEach((host) => {
            officialHostnames.add(host);
          });
        }
      })(),
    ]),
  );

  return officialHostnames;
};

export const validateOfficialDocumentUrl = async (
  url: string,
): Promise<OfficialDocumentValidationResult> => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      isOfficial: false,
      message: "유효한 URL 형식이 아닙니다.",
    };
  }

  const hostname = normalizeHostname(parsedUrl.hostname);
  const urlForPatternCheck = `${hostname}${parsedUrl.pathname}`;

  if (matchesAnyPattern(urlForPatternCheck, UNOFFICIAL_DOC_INDICATORS)) {
    return {
      isOfficial: false,
      message: OFFICIAL_DOCUMENT_ONLY_MESSAGE,
    };
  }

  if (matchesAnyPattern(urlForPatternCheck, OFFICIAL_DOC_PATTERNS)) {
    return {
      isOfficial: true,
      message: "",
    };
  }

  const officialHostnames = await collectOfficialHostnames(hostname);
  const isMatchedByRegistry = [...officialHostnames].some((officialHost) =>
    hostMatchesOfficialDomain(hostname, officialHost),
  );

  if (isMatchedByRegistry) {
    return {
      isOfficial: true,
      message: "",
    };
  }

  return {
    isOfficial: false,
    message: OFFICIAL_DOCUMENT_ONLY_MESSAGE,
  };
};
