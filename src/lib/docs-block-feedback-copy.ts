import type { DocsLocale } from "./i18n";

/*
 * Copy only the section feedback popover (feedback/text.tsx) shows. Its form
 * and confirmation reuse the page form's copy (docs-feedback-copy.ts).
 */
export type DocsBlockFeedbackCopy = {
  close: string;
  dialog: string;
  heading: string;
  helpful: string;
  helpfulLabel: string;
  hint: string;
  needsWork: string;
  needsWorkLabel: string;
  prompt: string;
};

export const DOCS_BLOCK_FEEDBACK_COPY = {
  en: {
    close: "Close block feedback",
    dialog: "Feedback on selected documentation",
    heading: "Feedback on this section",
    helpful: "Helpful",
    helpfulLabel: "Mark this section as helpful",
    hint: "Select a rating to add a note for the Ryu Docs team.",
    needsWork: "Needs work",
    needsWorkLabel: "Suggest an improvement for this section",
    prompt: "What should change?",
  },
  es: {
    close: "Cerrar comentarios de la sección",
    dialog: "Comentarios sobre la documentación seleccionada",
    heading: "Comentarios sobre esta sección",
    helpful: "Útil",
    helpfulLabel: "Marcar esta sección como útil",
    hint: "Elige una valoración para dejar una nota al equipo de Ryu Docs.",
    needsWork: "Mejorable",
    needsWorkLabel: "Sugerir una mejora para esta sección",
    prompt: "¿Qué debería cambiar?",
  },
  fr: {
    close: "Fermer l’avis sur la section",
    dialog: "Avis sur la documentation sélectionnée",
    heading: "Avis sur cette section",
    helpful: "Utile",
    helpfulLabel: "Marquer cette section comme utile",
    hint: "Choisissez une note pour laisser un message à l’équipe Ryu Docs.",
    needsWork: "À améliorer",
    needsWorkLabel: "Suggérer une amélioration pour cette section",
    prompt: "Que faudrait-il changer ?",
  },
  de: {
    close: "Abschnitts-Feedback schließen",
    dialog: "Feedback zur ausgewählten Dokumentation",
    heading: "Feedback zu diesem Abschnitt",
    helpful: "Hilfreich",
    helpfulLabel: "Diesen Abschnitt als hilfreich markieren",
    hint: "Wählen Sie eine Bewertung, um dem Ryu-Docs-Team eine Notiz zu senden.",
    needsWork: "Verbesserungsbedarf",
    needsWorkLabel: "Eine Verbesserung für diesen Abschnitt vorschlagen",
    prompt: "Was sollte sich ändern?",
  },
  "pt-br": {
    close: "Fechar feedback da seção",
    dialog: "Feedback sobre a documentação selecionada",
    heading: "Feedback sobre esta seção",
    helpful: "Útil",
    helpfulLabel: "Marcar esta seção como útil",
    hint: "Escolha uma avaliação para deixar uma nota para a equipe do Ryu Docs.",
    needsWork: "Precisa melhorar",
    needsWorkLabel: "Sugerir uma melhoria para esta seção",
    prompt: "O que deveria mudar?",
  },
  ja: {
    close: "セクションのフィードバックを閉じる",
    dialog: "選択したドキュメントへのフィードバック",
    heading: "このセクションへのフィードバック",
    helpful: "役に立った",
    helpfulLabel: "このセクションを役に立ったとしてマーク",
    hint: "評価を選ぶと、Ryu Docs チームへのメモを追加できます。",
    needsWork: "改善が必要",
    needsWorkLabel: "このセクションの改善を提案",
    prompt: "何を変えるべきですか？",
  },
  "zh-cn": {
    close: "关闭段落反馈",
    dialog: "对所选文档的反馈",
    heading: "对此部分的反馈",
    helpful: "有帮助",
    helpfulLabel: "将此部分标记为有帮助",
    hint: "选择一个评价，即可给 Ryu Docs 团队留言。",
    needsWork: "需要改进",
    needsWorkLabel: "为此部分提出改进建议",
    prompt: "应该改些什么？",
  },
  it: {
    close: "Chiudi il feedback sulla sezione",
    dialog: "Feedback sulla documentazione selezionata",
    heading: "Feedback su questa sezione",
    helpful: "Utile",
    helpfulLabel: "Segna questa sezione come utile",
    hint: "Scegli una valutazione per lasciare una nota al team di Ryu Docs.",
    needsWork: "Da migliorare",
    needsWorkLabel: "Suggerisci un miglioramento per questa sezione",
    prompt: "Cosa dovrebbe cambiare?",
  },
  ko: {
    close: "섹션 피드백 닫기",
    dialog: "선택한 문서에 대한 피드백",
    heading: "이 섹션에 대한 피드백",
    helpful: "도움이 됨",
    helpfulLabel: "이 섹션을 도움이 됨으로 표시",
    hint: "평가를 선택하면 Ryu Docs 팀에 메모를 남길 수 있습니다.",
    needsWork: "개선 필요",
    needsWorkLabel: "이 섹션의 개선 사항 제안",
    prompt: "무엇을 바꾸면 좋을까요?",
  },
  hi: {
    close: "अनुभाग फ़ीडबैक बंद करें",
    dialog: "चुने गए दस्तावेज़ पर फ़ीडबैक",
    heading: "इस अनुभाग पर फ़ीडबैक",
    helpful: "उपयोगी",
    helpfulLabel: "इस अनुभाग को उपयोगी के रूप में चिह्नित करें",
    hint: "Ryu Docs टीम के लिए नोट जोड़ने हेतु रेटिंग चुनें।",
    needsWork: "सुधार चाहिए",
    needsWorkLabel: "इस अनुभाग के लिए सुधार सुझाएँ",
    prompt: "क्या बदलना चाहिए?",
  },
  ru: {
    close: "Закрыть отзыв о разделе",
    dialog: "Отзыв о выбранной документации",
    heading: "Отзыв об этом разделе",
    helpful: "Полезно",
    helpfulLabel: "Отметить этот раздел как полезный",
    hint: "Выберите оценку, чтобы оставить заметку команде Ryu Docs.",
    needsWork: "Нужно доработать",
    needsWorkLabel: "Предложить улучшение для этого раздела",
    prompt: "Что стоит изменить?",
  },
  ar: {
    close: "إغلاق ملاحظات القسم",
    dialog: "ملاحظات على التوثيق المحدد",
    heading: "ملاحظات على هذا القسم",
    helpful: "مفيد",
    helpfulLabel: "وضع علامة على هذا القسم كمفيد",
    hint: "اختر تقييمًا لإضافة ملاحظة لفريق Ryu Docs.",
    needsWork: "يحتاج إلى تحسين",
    needsWorkLabel: "اقتراح تحسين لهذا القسم",
    prompt: "ما الذي يجب تغييره؟",
  },
} satisfies Record<DocsLocale, DocsBlockFeedbackCopy>;
