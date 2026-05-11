import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import type {
  ChatMessage,
  ChatSessionSummary,
  MaterialRecommendation,
  ProviderKey,
} from '@chatbot-ai/shared';

import { cn } from '../../utils/cn';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { IconButton } from '../ui/IconButton';
import { MaterialsPanel } from '../materials/MaterialsPanel';
import { PromptStarterChips } from '../chat/PromptStarterChips';
import { ProviderBadge } from '../chat/ProviderBadge';
import type { AggregatedSource } from '../../hooks/use-session-sources';

interface ContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: ProviderKey;
  currentSession: ChatSessionSummary | null;
  hasExternalProviders: boolean;
  latestSourcedMessage: ChatMessage | null;
  materials: MaterialRecommendation[];
  materialsError?: string | null;
  materialsErrorMeta?: string | null;
  materialsLoading: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onPromptSelect: (value: string) => void;
  onRetryMaterials?: () => void;
  sessionSources?: AggregatedSource[];
}

export const ContextDrawer = ({
  isOpen,
  onClose,
  activeProvider,
  currentSession,
  hasExternalProviders,
  latestSourcedMessage,
  materials,
  materialsError,
  materialsErrorMeta,
  materialsLoading,
  searchValue,
  onSearchChange,
  onPromptSelect,
  onRetryMaterials,
  sessionSources = [],
}: ContextDrawerProps) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const latestSources = latestSourcedMessage?.retrievalSnapshot?.materials.slice(0, 3) ?? [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] sm:hidden"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: 0.15 }}
          />

          <motion.aside
            ref={drawerRef}
            animate={{ x: 0 }}
            className="fixed bottom-0 right-0 top-0 z-50 flex w-[416px] max-w-[94vw] flex-col overflow-hidden rounded-l-[26px] border-l border-black/[0.08] bg-[rgba(250,252,255,0.98)] shadow-[0_26px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(12,18,30,0.97)]"
            exit={{ x: '100%' }}
            initial={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ocean/10 text-ocean dark:bg-cyan/15 dark:text-cyan">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink dark:text-slate-100">Learning Context</p>
                  <p className="text-xs leading-5 text-ink/62 dark:text-slate-400">
                    {currentSession?.title ?? 'No session'}
                  </p>
                </div>
              </div>

              <IconButton icon={<X className="h-4 w-4" />} onClick={onClose} tooltip="Close" variant="ghost" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <CollapsibleSection
                badge={hasExternalProviders ? 1 : 0}
                defaultOpen={true}
                icon={
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                }
                title="Quick Actions"
              >
                <div className="space-y-3">
                  <PromptStarterChips compact onSelect={onPromptSelect} />
                  <div className="flex items-center gap-2 pt-1">
                    <ProviderBadge provider={activeProvider} />
                    <span className="text-xs text-ink/50 dark:text-slate-500">
                      {hasExternalProviders ? 'AI ready' : 'Fallback mode'}
                    </span>
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                badge={latestSources.length}
                defaultOpen={latestSources.length > 0}
                icon={
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                }
                title="Nguồn mới nhất"
              >
                {latestSources.length > 0 ? (
                  <div className="space-y-2">
                    {latestSources.map((source) => (
                      <a
                        key={source.id}
                        className="focus-ring surface-card-interactive group flex items-start gap-3 p-3.5"
                        href={source.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium text-ink dark:text-slate-100">
                            {source.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-ink/60 dark:text-slate-400">
                            {source.subjectLabel}
                            {source.topicLabel ? ` · ${source.topicLabel}` : ''}
                          </p>
                        </div>
                        <svg
                          className="h-4 w-4 shrink-0 text-ink/30 transition group-hover:text-ocean dark:text-slate-600 dark:group-hover:text-cyan"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                          />
                        </svg>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-black/[0.08] bg-black/[0.02] p-4 text-center text-xs leading-5 text-ink/58 dark:border-white/10 dark:text-slate-500">
                    No sources used in recent responses
                  </p>
                )}
              </CollapsibleSection>

              <CollapsibleSection
                badge={sessionSources.length}
                defaultOpen={sessionSources.length > 0}
                icon={
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                }
                title="Tài liệu đã dùng"
              >
                {sessionSources.length > 0 ? (
                  <div className="space-y-2">
                    {sessionSources.map((source) => (
                      <a
                        key={source.id}
                        className="focus-ring surface-card-interactive group flex items-start gap-3 p-3.5"
                        href={source.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium text-ink dark:text-slate-100">
                            {source.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-ink/60 dark:text-slate-400">
                            {source.subjectLabel}
                            {source.topicLabel ? ` · ${source.topicLabel}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <svg
                            className="h-4 w-4 text-ink/30 transition group-hover:text-ocean dark:text-slate-600 dark:group-hover:text-cyan"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                            />
                          </svg>
                          <span className="rounded-full border border-ocean/20 bg-ocean/10 px-1.5 py-0.5 text-[10px] font-semibold text-ocean dark:border-cyan/20 dark:bg-cyan/12 dark:text-cyan">
                            {source.usageCount} lần
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-black/[0.08] bg-black/[0.02] p-4 text-center text-xs leading-5 text-ink/58 dark:border-white/10 dark:text-slate-500">
                    Chưa có tài liệu nào được dùng trong phiên này
                  </p>
                )}
              </CollapsibleSection>

              <CollapsibleSection
                badge={materials.length}
                defaultOpen={true}
                icon={
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                }
                title="Recommended Materials"
              >
                <MaterialsPanel
                  errorMessage={materialsError}
                  errorMeta={materialsErrorMeta}
                  isLoading={materialsLoading}
                  materials={materials}
                  onRetry={onRetryMaterials}
                  onSearchChange={onSearchChange}
                  searchValue={searchValue}
                  variant="drawer"
                />
              </CollapsibleSection>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
