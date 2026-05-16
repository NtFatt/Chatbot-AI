-- Extend runtime provider enum so Local LoRA usage and incidents can persist.
ALTER TYPE "ProviderKey" ADD VALUE IF NOT EXISTS 'local_lora';
