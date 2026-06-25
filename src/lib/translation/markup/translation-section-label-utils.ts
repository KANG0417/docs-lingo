export const DASH_SECTION_LABEL_LINE_PATTERN =
  /^\s*-\s*([^:\n]{1,48}):\s*(.*)$/u;

export interface DashSectionLabelLine {
  label: string;
  body: string;
}

export const parseDashSectionLabelLine = (
  line: string,
): DashSectionLabelLine | null => {
  const match = DASH_SECTION_LABEL_LINE_PATTERN.exec(line.trim());

  if (!match?.[1]) {
    return null;
  }

  return {
    label: match[1].trim(),
    body: (match[2] ?? "").trim(),
  };
};

export const isDashSectionLabelLine = (line: string): boolean => {
  return parseDashSectionLabelLine(line) !== null;
};
