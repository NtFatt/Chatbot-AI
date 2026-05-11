import type { AppLanguage, MaterialLevel } from '../constants/ui';

const levelLabels: Record<MaterialLevel, string> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
};

const languageHints: Record<AppLanguage, string> = {
  vi: 'Tra loi bang tieng Viet.',
  en: 'Respond in English.',
  bilingual: 'Tra loi song ngu Viet-Anh neu can, nhung metadata van nen gon, ro, va nhat quan.',
};

export const buildTurnIntelligenceSystemPrompt = (language: AppLanguage) =>
  [
    'Ban la bo phan phan tich chat hoc tap.',
    'Nhiem vu cua ban la tra ve metadata CO CAU TRUC cho mot luot hoi dap hoc tap.',
    'Chi tra ve du lieu phu hop schema duoc yeu cau.',
    'Can rat bao thu:',
    '- Chi dien subject/topic/level khi co can cu ro tu cau hoi, cau tra loi, hoac retrieval materials.',
    '- confidenceScore la muc do tin cay cua CAU TRA LOI GAN NHAT, dua tren do ro rang cua cau hoi va muc do ho tro tu context/retrieval.',
    '- Neu thieu can cu, tra ve null thay vi doan.',
    '- titleSuggestion chi nen co khi ten phien hien tai dang qua chung chung va ban co the dat ten ro hon trong 3-8 tu.',
    `Duoc phep su dung level: ${Object.values(levelLabels).join(', ')}.`,
    languageHints[language],
  ].join('\n');

export const buildTurnIntelligenceUserPrompt = (input: {
  question: string;
  answer: string;
  retrievalContext?: string | null;
  currentTitle?: string | null;
}) =>
  [
    `Current session title: ${input.currentTitle ?? 'N/A'}`,
    '',
    'User question:',
    input.question,
    '',
    'Assistant answer:',
    input.answer,
    '',
    'Retrieved study materials context:',
    input.retrievalContext ?? 'No retrieved materials for this turn.',
  ].join('\n');

export const buildSessionSummarySystemPrompt = (language: AppLanguage) =>
  [
    'Ban la bo phan tong hop tri thuc cho workspace hoc tap.',
    'Nhiem vu cua ban la tao context summary ngan, chinh xac, huu ich cho cac luot hoi dap tiep theo.',
    'Chi tra ve JSON hop schema.',
    'Tom tat phai:',
    '- ngam noi dung hoc tap chinh',
    '- ngan gon, de may va nguoi doc deu dung duoc',
    '- khong lap lai tung cau hoi',
    '- khong chen markdown',
    '- khong doan them khi khong chac',
    `Duoc phep su dung level: ${Object.values(levelLabels).join(', ')}.`,
    languageHints[language],
  ].join('\n');

export const buildSessionSummaryUserPrompt = (input: {
  currentTitle?: string | null;
  messagesTranscript: string;
  existingSummary?: string | null;
}) =>
  [
    `Current session title: ${input.currentTitle ?? 'N/A'}`,
    `Existing summary: ${input.existingSummary ?? 'N/A'}`,
    '',
    'Conversation transcript:',
    input.messagesTranscript,
  ].join('\n');
