import type { ReactElement } from "react";

interface LoadingBarProps {
  message: string;
}

export const LoadingBar = ({ message }: LoadingBarProps): ReactElement => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex w-full flex-col gap-3"
    >
      <p className="text-sm font-medium text-indigo-600">{message}</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
        <div className="loading-bar-indicator h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
      </div>
    </div>
  );
};
