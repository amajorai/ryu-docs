import {
  DOCS_BLOCK_FEEDBACK_COPY,
  type DocsBlockFeedbackCopy,
} from "./docs-block-feedback-copy";
import {
  DOCS_FEEDBACK_COPY,
  type DocsFeedbackCopy,
} from "./docs-feedback-copy";
import {
  DEFAULT_DOCS_LOCALE,
  type DocsLocale,
  directionForDocsLocale,
  isDocsLocale,
  localeForDocument,
} from "./i18n";

export type { DocsBlockFeedbackCopy } from "./docs-block-feedback-copy";
export type { DocsFeedbackCopy } from "./docs-feedback-copy";

/*
 * The docs site's own chrome copy (feedback widgets, landmark names), extending
 * the pageActionLabels/tocTitle pattern in fumadocs-translations.ts, which only
 * covers Fumadocs' provider keys. Brand names stay English.
 */
export type DocsLandmarkCopy = {
  /** Footer nav landmarks. */
  community: string;
  footer: string;
  getStarted: string;
  legal: string;
  /** Header control names. */
  download: string;
  github: string;
  home: string;
};

const DOCS_LANDMARK_COPY = {
  en: {
    community: "Community",
    download: "Download",
    footer: "Footer",
    getStarted: "Get started",
    github: "Ryu on GitHub",
    home: "Ryu home",
    legal: "Legal",
  },
  es: {
    community: "Comunidad",
    download: "Descargar",
    footer: "Pie de página",
    getStarted: "Comenzar",
    github: "Ryu en GitHub",
    home: "Inicio de Ryu",
    legal: "Legal",
  },
  fr: {
    community: "Communauté",
    download: "Télécharger",
    footer: "Pied de page",
    getStarted: "Commencer",
    github: "Ryu sur GitHub",
    home: "Accueil Ryu",
    legal: "Mentions légales",
  },
  de: {
    community: "Community",
    download: "Herunterladen",
    footer: "Fußzeile",
    getStarted: "Loslegen",
    github: "Ryu auf GitHub",
    home: "Ryu-Startseite",
    legal: "Rechtliches",
  },
  "pt-br": {
    community: "Comunidade",
    download: "Baixar",
    footer: "Rodapé",
    getStarted: "Começar",
    github: "Ryu no GitHub",
    home: "Página inicial do Ryu",
    legal: "Jurídico",
  },
  ja: {
    community: "コミュニティ",
    download: "ダウンロード",
    footer: "フッター",
    getStarted: "はじめる",
    github: "GitHub の Ryu",
    home: "Ryu ホーム",
    legal: "法的情報",
  },
  "zh-cn": {
    community: "社区",
    download: "下载",
    footer: "页脚",
    getStarted: "开始使用",
    github: "GitHub 上的 Ryu",
    home: "Ryu 首页",
    legal: "法律信息",
  },
  it: {
    community: "Community",
    download: "Scarica",
    footer: "Piè di pagina",
    getStarted: "Inizia",
    github: "Ryu su GitHub",
    home: "Home di Ryu",
    legal: "Note legali",
  },
  ko: {
    community: "커뮤니티",
    download: "다운로드",
    footer: "바닥글",
    getStarted: "시작하기",
    github: "GitHub의 Ryu",
    home: "Ryu 홈",
    legal: "법적 고지",
  },
  hi: {
    community: "समुदाय",
    download: "डाउनलोड करें",
    footer: "फ़ुटर",
    getStarted: "शुरू करें",
    github: "GitHub पर Ryu",
    home: "Ryu होम",
    legal: "कानूनी",
  },
  ru: {
    community: "Сообщество",
    download: "Скачать",
    footer: "Нижний колонтитул",
    getStarted: "Начать",
    github: "Ryu на GitHub",
    home: "Главная Ryu",
    legal: "Правовая информация",
  },
  ar: {
    community: "المجتمع",
    download: "تنزيل",
    footer: "التذييل",
    getStarted: "ابدأ",
    github: "Ryu على GitHub",
    home: "الصفحة الرئيسية لـ Ryu",
    legal: "المعلومات القانونية",
  },
} satisfies Record<DocsLocale, DocsLandmarkCopy>;

export type DocsChromeCopy = {
  blockFeedback: DocsBlockFeedbackCopy;
  /** The route's document direction, for chrome inside an English region. */
  dir: "ltr" | "rtl";
  feedback: DocsFeedbackCopy;
  landmarks: DocsLandmarkCopy;
  /** The route's BCP 47 language tag. */
  lang: string;
};

/** The docs chrome copy for a route locale; unknown locales get English. */
export function docsChromeCopy(locale: string | undefined): DocsChromeCopy {
  const resolved: DocsLocale = isDocsLocale(locale)
    ? locale
    : DEFAULT_DOCS_LOCALE;
  return {
    blockFeedback: DOCS_BLOCK_FEEDBACK_COPY[resolved],
    dir: directionForDocsLocale(resolved),
    feedback: DOCS_FEEDBACK_COPY[resolved],
    landmarks: DOCS_LANDMARK_COPY[resolved],
    lang: localeForDocument(resolved),
  };
}
