import { Copy, FilePlus2, ListChecks, Loader2, RotateCcw, Sparkles, WalletCards } from 'lucide-react';
import { toast } from 'sonner';

import type { ArtifactGenerateType } from '@chatbot-ai/shared';

import { Button } from '../ui/Button';

interface MessageActionBarProps {
  content: string;
  onRegenerate?: () => void;
  onPrefill?: (value: string) => void;
  onGenerateArtifact?: (
    type: ArtifactGenerateType,
    sourceContent: string,
  ) => Promise<void>;
  generatingType?: ArtifactGenerateType | null;
}

const artifactButtons: {
  type: ArtifactGenerateType;
  label: string;
  icon: typeof ListChecks;
  prompt: string;
}[] = [
  {
    type: 'summary',
    label: 'Tóm tắt',
    icon: ListChecks,
    prompt: 'Tóm tắt lại câu trả lời trên thành 5 ý chính ngắn gọn, dễ ôn tập.',
  },
  {
    type: 'flashcard_set',
    label: 'Flashcard',
    icon: WalletCards,
    prompt: 'Từ nội dung phía trên, hãy tạo cho mình 5 flashcard hỏi đáp để ôn nhanh.',
  },
  {
    type: 'quiz_set',
    label: 'Quiz',
    icon: Sparkles,
    prompt: 'Từ nội dung trên, tạo 5 câu hỏi trắc nghiệm để tự kiểm tra.',
  },
  {
    type: 'note',
    label: 'Ghi chú',
    icon: FilePlus2,
    prompt: 'Chuyển câu trả lời trên thành ghi chú học tập ngắn gọn, dễ chép lại.',
  },
];

export const MessageActionBar = ({
  content,
  onRegenerate,
  onPrefill,
  onGenerateArtifact,
  generatingType,
}: MessageActionBarProps) => {
  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Đã sao chép câu trả lời');
    } catch {
      toast.error('Không thể sao chép lúc này');
    }
  };

  const handleGenerate = async (type: ArtifactGenerateType) => {
    if (!onGenerateArtifact) {
      onPrefill?.(artifactButtons.find((b) => b.type === type)?.prompt ?? '');
      return;
    }
    try {
      await onGenerateArtifact(type, content);
    } catch {
      toast.error('Không thể tạo artifact. Thử lại sau.');
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button
        leading={<Copy className="h-3.5 w-3.5" />}
        onClick={() => void copyContent()}
        size="sm"
        type="button"
        variant="secondary"
      >
        Sao chép
      </Button>
      {onRegenerate ? (
        <Button
          leading={<RotateCcw className="h-3.5 w-3.5" />}
          onClick={onRegenerate}
          size="sm"
          type="button"
          variant="ghost"
        >
          Tạo lại
        </Button>
      ) : null}
      {onGenerateArtifact ? (
        <>
          {artifactButtons.map(({ type, label, icon: Icon }) => {
            const isGenerating = generatingType === type;
            return (
              <Button
                key={type}
                leading={
                  isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )
                }
                onClick={() => void handleGenerate(type)}
                size="sm"
                type="button"
                variant="ghost"
                disabled={isGenerating || generatingType !== null}
              >
                {isGenerating ? 'Đang tạo...' : label}
              </Button>
            );
          })}
        </>
      ) : onPrefill ? (
        <>
          {artifactButtons.map(({ type, label, icon: Icon, prompt }) => (
            <Button
              key={type}
              leading={<Icon className="h-3.5 w-3.5" />}
              onClick={() => onPrefill(prompt)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {label}
            </Button>
          ))}
        </>
      ) : null}
      {onPrefill && (
        <Button
          leading={<Sparkles className="h-3.5 w-3.5" />}
          onClick={() =>
            onPrefill('Gợi ý cho mình 3 câu hỏi follow-up thông minh để học sâu hơn từ nội dung trên.')
          }
          size="sm"
          type="button"
          variant="soft"
        >
          Hỏi tiếp
        </Button>
      )}
    </div>
  );
};
