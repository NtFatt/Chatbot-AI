import { Copy, FilePlus2, ListChecks, RotateCcw, Sparkles, WalletCards } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../ui/Button';

export const MessageActionBar = ({
  content,
  onRegenerate,
  onPrefill,
}: {
  content: string;
  onRegenerate?: () => void;
  onPrefill?: (value: string) => void;
}) => {
  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Đã sao chép câu trả lời');
    } catch {
      toast.error('Không thể sao chép lúc này');
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button leading={<Copy className="h-3.5 w-3.5" />} onClick={() => void copyContent()} size="sm" type="button" variant="secondary">
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
      {onPrefill ? (
        <>
          <Button
            leading={<ListChecks className="h-3.5 w-3.5" />}
            onClick={() => onPrefill('Tóm tắt lại câu trả lời trên thành 5 ý chính ngắn gọn, dễ ôn tập.')}
            size="sm"
            type="button"
            variant="ghost"
          >
            Tóm tắt
          </Button>
          <Button
            leading={<WalletCards className="h-3.5 w-3.5" />}
            onClick={() =>
              onPrefill('Từ nội dung phía trên, hãy tạo cho mình 5 flashcard hỏi đáp để ôn nhanh.')
            }
            size="sm"
            type="button"
            variant="ghost"
          >
            Tạo flashcard
          </Button>
          <Button
            leading={<FilePlus2 className="h-3.5 w-3.5" />}
            onClick={() =>
              onPrefill('Chuyển câu trả lời trên thành ghi chú học tập ngắn gọn, dễ chép lại.')
            }
            size="sm"
            type="button"
            variant="ghost"
          >
            Lưu dạng note
          </Button>
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
        </>
      ) : null}
    </div>
  );
};
