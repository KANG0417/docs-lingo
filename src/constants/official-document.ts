export const OFFICIAL_DOC_PATTERNS: RegExp[] = [
  /docs\.[a-z0-9-]+\.(com|io|dev|org)/,
  /[a-z0-9-]+\.dev\/docs/,
  /[a-z0-9-]+\.dev\/(learn|reference|guide|api)(\/|$)/,
  /[a-z0-9-]+\.(com|io|dev|org|net)\/(docs|documentation|guide|guides|learn|reference|api|manual|handbook|tutorial|tutorials)(\/|$)/,
  /developer\.[a-z0-9-]+\.com/,
  /\.readthedocs\.io/,
  /github\.io\/.*\/(docs|guide)/,
  /docs\.github\.com/,
  /docs\.python\.org/,
  /developer\.mozilla\.org/,
  /developer\.chrome\.com\/docs/,
  /learn\.microsoft\.com/,
  /nodejs\.org\/(api|docs)(\/|$)/,
];

export const UNOFFICIAL_DOC_INDICATORS: RegExp[] = [
  /medium\.com/,
  /dev\.to/,
  /tistory\.com/,
  /velog\.io/,
  /stackoverflow\.com/,
  /blog\./,
];

export const OFFICIAL_DOCUMENT_ONLY_MESSAGE =
  "공식 문서만 번역됩니다.\n블로그·커뮤니티·Q&A 사이트 URL은 지원하지 않습니다.\nnpm 또는 PyPI에 등록된 패키지의 공식 홈페이지·문서 URL을 입력해 주세요.";

export const isOfficialDocumentOnlyMessage = (
  message: string | null | undefined,
): boolean => {
  if (!message) {
    return false;
  }

  const headline = OFFICIAL_DOCUMENT_ONLY_MESSAGE.split("\n")[0] ?? "";
  return message.startsWith(headline);
};
