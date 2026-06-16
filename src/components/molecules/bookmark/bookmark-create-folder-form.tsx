"use client";

import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { BookmarkFolderNameCounter } from "@/components/atoms/text/bookmark-folder-name-counter";
import {
  enforceFolderNameMaxLength,
  validateFolderName,
} from "@/lib/bookmark/validate-folder-name";

interface BookmarkCreateFolderFormProps {
  isSubmitting: boolean;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
}

export const BookmarkCreateFolderForm = ({
  isSubmitting,
  onSubmit,
  onCancel,
}: BookmarkCreateFolderFormProps): ReactElement => {
  const [name, setName] = useState<string>("");
  const validationError = name.trim() ? validateFolderName(name) : null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const error = validateFolderName(name);

    if (error) {
      return;
    }

    void (async (): Promise<void> => {
      await onSubmit(name.trim());
      setName("");
    })();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bookmark-create-folder-form"
      aria-label="새 폴더 만들기"
    >
      <div className="bookmark-create-folder-input-wrap">
        <label className="sr-only" htmlFor="bookmark-folder-name">
          폴더 이름
        </label>
        <input
          id="bookmark-folder-name"
          type="text"
          value={name}
          placeholder="폴더 이름"
          disabled={isSubmitting}
          onChange={(event) => {
            setName(enforceFolderNameMaxLength(event.target.value));
          }}
          className="bookmark-create-folder-input font-doc-aux"
        />
        <BookmarkFolderNameCounter
          value={name}
          className="bookmark-folder-name-counter bookmark-folder-name-counter--create font-doc-aux"
        />
      </div>
      {validationError && (
        <p className="bookmark-create-folder-error font-doc-aux" role="alert">
          {validationError}
        </p>
      )}
      <div className="bookmark-create-folder-actions">
        <button
          type="submit"
          disabled={isSubmitting || validateFolderName(name) !== null}
          className="bookmark-create-folder-submit font-doc-aux"
        >
          {isSubmitting ? "…" : "만들기"}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          className="bookmark-create-folder-cancel font-doc-aux"
        >
          취소
        </button>
      </div>
    </form>
  );
};
