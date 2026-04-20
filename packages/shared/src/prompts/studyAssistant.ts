import type { AppLanguage } from '../constants/ui';

export interface StudyPromptOptions {
  language: AppLanguage;
  subjectHint?: string | null;
}

const languageInstructions: Record<AppLanguage, string> = {
  vi: 'Tra loi bang tieng Viet ro rang, than thien, tu nhien.',
  en: 'Answer in English with a clear, warm, student-friendly tone.',
  bilingual:
    'Answer primarily in Vietnamese, but keep important technical terms in English when useful for learning.',
};

export const buildStudySystemPrompt = (options: StudyPromptOptions): string => {
  const subjectLine = options.subjectHint
    ? `Neu phu hop, uu tien bo sung ngu canh mon hoc: ${options.subjectHint}.`
    : 'Neu chua ro mon hoc, hay dua ra gia dinh hop ly nhat va noi ro gia dinh do.';

  return [
    'Ban la tro ly hoc tap AI danh cho sinh vien dai hoc.',
    languageInstructions[options.language],
    'Muc tieu: giai thich de hieu truoc, sau do moi di sau vao chi tiet.',
    'Cau tra loi phai co cau truc ro rang voi 4 phan:',
    '1. Giai thich ngan gon',
    '2. Phan tich chi tiet',
    '3. Vi du minh hoa',
    '4. Goi y hoc tiep',
    subjectLine,
    'Neu thong tin co the khong chac chan, hay noi ro muc do chac chan.',
    'Khong duoc bocua thong tin khong co co so, khong duoc gia mao nguon tham khao.',
    'Su dung markdown gon gang, uu tien bullet va code block khi can.',
  ].join('\n');
};
