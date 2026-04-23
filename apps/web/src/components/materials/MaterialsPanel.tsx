import { AlertCircle, BookOpenText, Link2, RefreshCcw, Search } from 'lucide-react';

import type { MaterialRecommendation } from '@chatbot-ai/shared';

const levelLabels = {
  beginner: 'Cơ bản',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao',
} as const;

const typeLabels = {
  pdf: 'PDF',
  video: 'Video',
  slide: 'Slide',
  article: 'Bài viết',
  textbook: 'Giáo trình',
  exercise: 'Bài tập',
} as const;

export const MaterialsPanel = ({
  searchValue,
  onSearchChange,
  materials,
  isLoading,
  errorMessage,
  errorMeta,
  onRetry,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  materials: MaterialRecommendation[];
  isLoading: boolean;
  errorMessage?: string | null;
  errorMeta?: string | null;
  onRetry?: () => void;
}) => {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <label className="shrink-0 flex items-center gap-3 rounded-full border border-black/8 bg-white/75 px-4 py-3 dark:border-white/10 dark:bg-slate-900/55">
        <Search className="h-4 w-4 text-ink/45 dark:text-slate-400" />
        <input
          aria-label="Tìm tài liệu"
          className="focus-ring w-full bg-transparent text-sm outline-none placeholder:text-ink/40 dark:text-slate-100 dark:placeholder:text-slate-500"
          data-testid="materials-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Ví dụ: SQL joins, đạo hàm, hồi quy..."
          type="search"
          value={searchValue}
        />
      </label>

      <div className="app-scrollbar mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div className="animate-pulse rounded-[24px] bg-black/5 p-4 dark:bg-white/5" key={index}>
                <div className="h-4 w-3/4 rounded bg-black/10 dark:bg-white/10" />
                <div className="mt-3 h-3 w-full rounded bg-black/10 dark:bg-white/10" />
                <div className="mt-2 h-3 w-2/3 rounded bg-black/10 dark:bg-white/10" />
              </div>
            ))
          : null}

        {!isLoading && errorMessage ? (
          <div className="rounded-[24px] border border-red-500/20 bg-red-500/5 px-4 py-5 text-sm dark:border-red-500/25">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-red-600 dark:text-red-300">Không tải được gợi ý tài liệu</p>
                <p className="mt-2 leading-6 text-ink/70 dark:text-slate-300">{errorMessage}</p>
                {errorMeta ? (
                  <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-red-500/80 dark:text-red-300/80">
                    {errorMeta}
                  </p>
                ) : null}
                {onRetry ? (
                  <button
                    className="focus-ring mt-3 inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] dark:border-white/10"
                    onClick={onRetry}
                    type="button"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Tải lại
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {!isLoading && !errorMessage && materials.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-black/10 px-4 py-8 text-center dark:border-white/10">
            <BookOpenText className="mx-auto h-10 w-10 text-ink/40 dark:text-slate-500" />
            <p className="mt-4 font-medium">Chưa tìm thấy tài liệu phù hợp</p>
            <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-slate-400">
              Thử từ khóa rộng hơn hoặc gửi thêm câu hỏi trong khung chat để hệ thống hiểu rõ ngữ cảnh.
            </p>
          </div>
        ) : null}

        {!isLoading && !errorMessage
          ? materials.map((material) => (
              <article
                className="rounded-[26px] border border-black/5 bg-white/82 p-5 transition hover:border-black/10 hover:shadow-soft dark:border-white/10 dark:bg-slate-900/65"
                data-testid={`material-${material.id}`}
                key={material.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold leading-8">{material.title}</p>
                    <p className="mt-2 text-sm leading-7 text-ink/65 dark:text-slate-300">
                      {material.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-cyan/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-ocean dark:text-cyan">
                    {typeLabels[material.type]}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-black/8 px-2.5 py-1 text-[11px] font-medium text-ink/68 dark:border-white/10 dark:text-slate-300">
                    {material.subject.nameVi}
                  </span>
                  {material.topic ? (
                    <span className="rounded-full border border-black/8 px-2.5 py-1 text-[11px] font-medium text-ink/68 dark:border-white/10 dark:text-slate-300">
                      {material.topic.nameVi}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-black/8 px-2.5 py-1 text-[11px] font-medium text-ink/68 dark:border-white/10 dark:text-slate-300">
                    {levelLabels[material.level]}
                  </span>
                  <span className="rounded-full border border-black/8 px-2.5 py-1 text-[11px] font-medium text-ink/68 dark:border-white/10 dark:text-slate-300">
                    Điểm phù hợp {Math.round(material.score)}
                  </span>
                </div>

                <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-ink/48 dark:text-slate-500">
                  Nguồn: {material.source}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {material.reason.map((item) => (
                    <span
                      className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] text-ink/70 dark:border-white/10 dark:text-slate-300"
                      key={item}
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <a
                  className="focus-ring mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ocean dark:text-cyan"
                  href={material.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Link2 className="h-4 w-4" />
                  Mở tài liệu
                </a>
              </article>
            ))
          : null}
      </div>
    </div>
  );
};
