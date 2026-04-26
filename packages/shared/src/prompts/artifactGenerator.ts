import type { ArtifactGenerateType } from '../types/artifacts';

const buildFlashcardPrompt = (content: string, language: string): string => `
Ban la mot tro ly hoc tap AI. Tu noi dung ngu canh sau, hay tao 5 flashcard hoi-dap de nguoi hoc co the tu kiem tra kien thuc.

TRA VE DUNG DINH DANG JSON sau, khong co gi khac:
\`\`\`json
[
  {"front": "cau hoi 1", "back": "cau tra loi 1"},
  {"front": "cau hoi 2", "back": "cau tra loi 2"},
  {"front": "cau hoi 3", "back": "cau tra loi 3"},
  {"front": "cau hoi 4", "back": "cau tra loi 4"},
  {"front": "cau hoi 5", "back": "cau tra loi 5"}
]
\`\`\`

Quy tac:
- Moi flashcard co 1 cau hoi (front) va 1 cau tra loi (back)
- Cau hoi phai ngan gon, chi dinh 1 khai niem hoac 1 su that
- Cau tra loi phai ro rang, du day du de hieu ma khong can them ngon luc
- Dua tren noi dung quan trong nhat cua ngu canh
- Neu ngu canh bang tieng Viet, tra ve flashcard tieng Viet
- Neu ngu canh bang tieng Anh, tra ve flashcard tieng Anh
- Chi tra ve mang JSON, khong co explanation

NGU CANH:
${content}
`.trim();

const buildQuizPrompt = (content: string, language: string): string => `
Ban la mot tro ly hoc tap AI. Tu noi dung ngu canh sau, hay tao 5 cau hoi trac nghiem de nguoi hoc co the tu kiem tra kien thuc.

TRA VE DUNG DINH DANG JSON sau, khong co gi khac:
\`\`\`json
[
  {
    "question": "cau hoi 1",
    "options": ["lua chon A", "lua chon B", "lua chon C", "lua chon D"],
    "answer": 0,
    "explanation": "giai thich tai sao dung"
  },
  ... 5 items
]
\`\`\`

Quy tac:
- Moi cau hoi co 4 lua chon, answer la chi so (0=A, 1=B, 2=C, 3=D)
- Cac lua chon phai hoc thuyet, chi 1 dap an dung
- Question ngan gon, chi dinh 1 diem kien thuc
- Explanation ngan gon giai thich tai sao dap an dung
- Dua tren noi dung quan trong nhat cua ngu canh
- Neu ngu canh bang tieng Viet, tra ve cau hoi tieng Viet
- Neu ngu canh bang tieng Anh, tra ve cau hoi tieng Anh
- Chi tra ve mang JSON, khong co explanation

NGU CANH:
${content}
`.trim();

const buildSummaryPrompt = (content: string, language: string): string => `
Ban la mot tro ly hoc tap AI. Tu noi dung ngu canh sau, hay tao mot tom tat cau truc de nguoi hoc co the nhanh chong on lai.

TRA VE DUNG DINH DANG JSON sau, khong co gi khac:
\`\`\`json
{
  "bullets": ["y 1", "y 2", "y 3", "y 4", "y 5"],
  "keyTerms": ["dinh nghia 1", "dinh nghia 2"]
}
\`\`\`

Quy tac:
- Tra ve 5 bullet points ngan gon, moi diem chi 1 y chinh
- Cac bullet phai the hien noi dung quan trong nhat theo thu tu logic
- keyTerms la danh sach cac dinh nghia hoac thuat ngu quan trong (neu co)
- Tra ve JSON thuan, khong co markdown formatting trong gia tri
- Neu ngu canh bang tieng Viet, tra ve tom tat tieng Viet
- Neu ngu canh bang tieng Anh, tra ve tom tat tieng Anh

NGU CANH:
${content}
`.trim();

const buildNotePrompt = (content: string, language: string): string => `
Ban la mot tro ly hoc tap AI. Tu noi dung ngu canh sau, hay tao mot ghi chu hoc tap ngan gon, de nguoi co the de dang ghi lai hoac xem lai.

TRA VE DUNG DINH DANG JSON sau, khong co gi khac:
\`\`\`json
{
  "body": "noi dung ghi chu",
  "tags": ["tag1", "tag2", "tag3"]
}
\`\`\`

Quy tac:
- Body la van ban co cau truc, ngan gon, de doc lai
- Su dung headers (# ##) neu can de tao cau truc
- tags la danh sach tu 2-5 tag giup phan loai ghi chu
- Neu ngu canh bang tieng Viet, tra ve ghi chu tieng Viet
- Neu ngu canh bang tieng Anh, tra ve ghi chu tieng Anh
- Chi tra ve JSON thuan, khong co markdown code blocks trong gia tri body

NGU CANH:
${content}
`.trim();

export const buildArtifactSystemPrompt = (): string => `
Ban la tro ly hoc tap AI chuyen tao noi dung hoc thuat co cau truc.
Ban chi tra ve JSON thuan, khong co explanation, khong co markdown code blocks, khong co text khac ngoai JSON.
Ranh gioi JSON phai chinh xac, co the parse bang JSON.parse() ma khong co loi.
`.trim();

export const buildArtifactUserPrompt = (
  type: ArtifactGenerateType,
  content: string,
  language: string,
): string => {
  switch (type) {
    case 'flashcard_set':
      return buildFlashcardPrompt(content, language);
    case 'quiz_set':
      return buildQuizPrompt(content, language);
    case 'summary':
      return buildSummaryPrompt(content, language);
    case 'note':
      return buildNotePrompt(content, language);
  }
};
