process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://chatbot_ai:chatbot_ai@localhost:5432/chatbot_ai?schema=public';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? '0123456789abcdef0123456789abcdef';
