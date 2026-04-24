import { ArrowUpRight, BookOpenText, Search } from 'lucide-react';

import type { RetrievalSnapshot } from '@chatbot-ai/shared';

export const MessageSources = ({
  retrievalSnapshot,
}: {
  retrievalSnapshot: RetrievalSnapshot;
}) => {
  if (retrievalSnapshot.materials.length === 0) {
    return null;
  }

  return (
    <section className="mt-5 rounded-[22px] border border-black/[0.06] bg-black/[0.02] px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpenText className="h-4 w-4 text-ocean dark:text-cyan" />
            <p className="text-sm font-semibold">Nguồn đã dùng trong câu trả lời này</p>
          </div>
          {retrievalSnapshot.queryExpansion.length > 0 ? (
            <p className="mt-2 inline-flex items-center gap-2 text-xs leading-5 text-ink/56 dark:text-slate-400">
              <Search className="h-3.5 w-3.5" />
              Từ khóa mở rộng: {retrievalSnapshot.queryExpansion.join(', ')}
            </p>
          ) : null}
        </div>
        <span className="rounded-full border border-black/[0.08] bg-white/84 px-2.5 py-1 text-[11px] font-medium text-ink/56 dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-300">
          {retrievalSnapshot.materials.length} nguồn
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {retrievalSnapshot.materials.map((source) => (
          <article
            className="rounded-[18px] border border-black/[0.06] bg-white/82 px-3.5 py-3 dark:border-white/10 dark:bg-slate-950/38"
            key={source.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-2 text-[15px] font-semibold leading-6">{source.title}</p>
                <p className="mt-1 text-xs leading-5 text-ink/52 dark:text-slate-400">
                  {source.subjectLabel}
                  {source.topicLabel ? ` · ${source.topicLabel}` : ''}
                  {` · độ phù hợp ${Math.round(source.score)}`}
                </p>
              </div>
              <a
                className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.08] dark:border-white/10"
                href={source.url}
                rel="noreferrer"
                target="_blank"
              >
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
            <p className="mt-2 text-sm leading-6 text-ink/68 dark:text-slate-300">{source.snippet}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {source.reason.map((item) => (
                <span
                  className="rounded-full border border-black/[0.08] bg-black/[0.025] px-2.5 py-1 text-[11px] text-ink/60 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
