interface PinnedFolderSortable {
  isDefault?: boolean;
}

export const sortPinnedFolderFirst = <T extends PinnedFolderSortable>(
  folders: T[],
): T[] => {
  const pinnedIndex = folders.findIndex((folder) => folder.isDefault);

  if (pinnedIndex <= 0) {
    return folders;
  }

  const nextFolders = [...folders];
  const [pinnedFolder] = nextFolders.splice(pinnedIndex, 1);
  nextFolders.unshift(pinnedFolder);

  return nextFolders;
};
