"use client";

import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { MAX_BOOKMARK_FOLDER_NAME_LENGTH } from "@/constants/bookmark";

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    void (async (): Promise<void> => {
      await onSubmit(name);
      setName("");
    })();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bookmark-create-folder-form"
      aria-label="새 폴더 만들기"
    >
      <label className="sr-only" htmlFor="bookmark-folder-name">
        폴더 이름
      </label>
      <input
        id="bookmark-folder-name"
        type="text"
        value={name}
        maxLength={MAX_BOOKMARK_FOLDER_NAME_LENGTH}
        placeholder="폴더 이름"
        disabled={isSubmitting}
        onChange={(event) => {
          setName(event.target.value);
        }}
        className="bookmark-create-folder-input font-doc-aux"
      />
      <div className="bookmark-create-folder-actions">
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
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
