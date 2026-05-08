import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Home, LoaderCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import type { StudyArtifact } from '@chatbot-ai/shared';

import { ArtifactPreview } from '../../components/chat/ArtifactPreview';
import { fetchPublicArtifact } from '../../services/artifacts-service';
import { toPanelError } from '../../utils/transport-errors';

export const PublicArtifactPage = () => {
  const params = useParams<{ shareToken: string }>();
  const shareToken = params.shareToken ?? '';

  const artifactQuery = useQuery({
    enabled: shareToken.trim().length > 0,
    queryKey: ['public-artifact', shareToken],
    queryFn: () => fetchPublicArtifact(shareToken),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const error = artifactQuery.error
    ? toPanelError(artifactQuery.error, 'Không thể mở artifact được chia sẻ.')
    : null;

  const displayArtifact = useMemo<StudyArtifact | null>(() => {
    if (!artifactQuery.data) {
      return null;
    }

    return {
      id: artifactQuery.data.id,
      userId: 'public',
      sessionId: null,
      sessionTitle: null,
      messageId: null,
      type: artifactQuery.data.type,
      title: artifactQuery.data.title,
      content: artifactQuery.data.content,
      isFavorited: false,
      isShared: true,
      qualityScore: artifactQuery.data.qualityScore,
      createdAt: artifactQuery.data.createdAt,
      updatedAt: artifactQuery.data.createdAt,
    };
  }, [artifactQuery.data]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,139,141,0.08),_transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef4f8_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.1),_transparent_34%),linear-gradient(180deg,#08111f_0%,#0f172a_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl flex-col">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/45 dark:text-slate-500">
              Shared Study Artifact
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-ink dark:text-slate-50">
              Public read-only artifact
            </h1>
          </div>
          <Link
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-black/[0.08] bg-white/88 px-3 py-2 text-sm font-medium text-ink/72 transition hover:border-black/[0.12] hover:bg-white hover:text-ink dark:border-white/10 dark:bg-slate-900/74 dark:text-slate-300 dark:hover:bg-slate-900/92 dark:hover:text-white"
            to="/app"
          >
            <Home className="h-4 w-4" />
            Open app
          </Link>
        </div>

        <div className="flex-1 rounded-[28px] border border-black/[0.06] bg-white/82 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(12,18,30,0.88)]">
          {artifactQuery.isLoading ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-ocean dark:text-cyan" />
              <p className="mt-4 text-sm font-medium text-ink/70 dark:text-slate-300">
                Loading shared artifact...
              </p>
            </div>
          ) : error ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <AlertCircle className="h-9 w-9 text-red-500/70 dark:text-red-400/70" />
              <p className="mt-4 text-sm font-semibold text-ink dark:text-slate-100">
                This shared artifact is unavailable
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-ink/62 dark:text-slate-400">
                {error.message}
              </p>
              {error.meta ? (
                <p className="mt-2 text-xs text-ink/48 dark:text-slate-500">{error.meta}</p>
              ) : null}
            </div>
          ) : displayArtifact ? (
            <div className="mx-auto max-w-2xl">
              <ArtifactPreview artifact={displayArtifact} />
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <AlertCircle className="h-9 w-9 text-ink/35 dark:text-slate-600" />
              <p className="mt-4 text-sm font-semibold text-ink dark:text-slate-100">
                Shared artifact not found
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
