export interface DocumentCodeBlockVariant {
  packageManager: string;
  code: string;
  language: string;
}

export interface DocumentCodeBlock {
  id: string;
  label: string | null;
  sectionIndex: number;
  sectionHeading: string | null;
  variants: DocumentCodeBlockVariant[];
}
