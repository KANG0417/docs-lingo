import type { ReactElement } from "react";
import { NICKNAME_RULE_LINES } from "@/constants/nickname";

export const NicknameRuleList = (): ReactElement => {
  return (
    <ul className="flex flex-col gap-1">
      {NICKNAME_RULE_LINES.map((segments, ruleIndex) => (
        <li
          key={`nickname-rule-${ruleIndex}`}
          className="font-doc-nickname-rules text-sm font-medium leading-relaxed text-[#141c4a]"
        >
          ·{" "}
          {segments.map((segment, segmentIndex) =>
            segment.emphasize ? (
              <strong
                key={`nickname-rule-${ruleIndex}-${segmentIndex}`}
                className="font-bold text-[#0a1030]"
              >
                {segment.text}
              </strong>
            ) : (
              <span key={`nickname-rule-${ruleIndex}-${segmentIndex}`}>
                {segment.text}
              </span>
            ),
          )}
        </li>
      ))}
    </ul>
  );
};
