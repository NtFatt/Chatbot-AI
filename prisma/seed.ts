import { PrismaClient, ProviderKey } from '@prisma/client';

const prisma = new PrismaClient();

const materialsSeed = [
  {
    subject: {
      slug: 'data-structures',
      nameVi: 'Cau truc du lieu',
      nameEn: 'Data Structures',
      description: 'Nen tang cho giai thuat, truy van va to chuc du lieu.',
    },
    topic: {
      slug: 'trees-graphs',
      nameVi: 'Cay va do thi',
      nameEn: 'Trees and Graphs',
    },
    materials: [
      {
        title: 'Visual Guide to Trees and Traversal Patterns',
        description:
          'A compact visual handbook for binary trees, DFS, BFS, and traversal intuition with annotated diagrams.',
        url: 'https://example.edu/materials/trees-traversal-guide',
        type: 'article',
        level: 'beginner',
        language: 'en',
        source: 'Open Learning Lab',
        tags: ['tree', 'dfs', 'bfs', 'binary-tree', 'visual'],
        isFeatured: true,
      },
      {
        title: 'Do thi can ban cho sinh vien CNTT',
        description:
          'Slide tieng Viet tong hop khai niem dinh, canh, DFS, BFS, shortest path va cac bai tap nen luyen.',
        url: 'https://example.edu/materials/do-thi-can-ban',
        type: 'slide',
        level: 'intermediate',
        language: 'vi',
        source: 'Khoa CNTT Demo University',
        tags: ['do-thi', 'dfs', 'bfs', 'duong-di-ngan-nhat', 'slide'],
        isFeatured: true,
      },
      {
        title: 'Practice Set: Tree Recursion and Graph Search',
        description:
          'Curated exercises covering recursion on trees, connected components, shortest paths, and graph modeling.',
        url: 'https://example.edu/materials/tree-graph-practice',
        type: 'exercise',
        level: 'advanced',
        language: 'en',
        source: 'Problem Studio',
        tags: ['tree', 'graph', 'practice', 'recursion', 'search'],
        isFeatured: false,
      },
    ],
  },
  {
    subject: {
      slug: 'calculus',
      nameVi: 'Giai tich',
      nameEn: 'Calculus',
      description: 'Dao ham, tich phan va ung dung phan tich ham so.',
    },
    topic: {
      slug: 'derivatives-integrals',
      nameVi: 'Dao ham va tich phan',
      nameEn: 'Derivatives and Integrals',
    },
    materials: [
      {
        title: 'Derivative Intuition for First-Year Students',
        description:
          'Build intuition around rate of change, tangent lines, and common derivative patterns before memorizing formulas.',
        url: 'https://example.edu/materials/derivative-intuition',
        type: 'video',
        level: 'beginner',
        language: 'en',
        source: 'Math Visual Academy',
        tags: ['derivative', 'rate-of-change', 'limit', 'intro'],
        isFeatured: true,
      },
      {
        title: 'Tong hop cong thuc tich phan co vi du',
        description:
          'Bang cong thuc tong hop cac dang tich phan co ban kem vi du va meo nhan dang de thi.',
        url: 'https://example.edu/materials/tich-phan-cong-thuc',
        type: 'pdf',
        level: 'intermediate',
        language: 'vi',
        source: 'Math Club Archive',
        tags: ['tich-phan', 'cong-thuc', 'vi-du', 'exam'],
        isFeatured: true,
      },
      {
        title: 'Calculus Problem Bank: Limits, Derivatives, Integrals',
        description:
          'A practice-first textbook chapter with mixed exercises and solution strategies for undergraduate review.',
        url: 'https://example.edu/materials/calculus-problem-bank',
        type: 'textbook',
        level: 'advanced',
        language: 'en',
        source: 'STEM Library',
        tags: ['limits', 'derivatives', 'integrals', 'exercise', 'review'],
        isFeatured: false,
      },
    ],
  },
  {
    subject: {
      slug: 'database-systems',
      nameVi: 'He quan tri co so du lieu',
      nameEn: 'Database Systems',
      description: 'Mo hinh du lieu, SQL, toi uu truy van va chuan hoa.',
    },
    topic: {
      slug: 'sql-normalization',
      nameVi: 'SQL va chuan hoa',
      nameEn: 'SQL and Normalization',
    },
    materials: [
      {
        title: 'SQL Query Patterns for Coursework',
        description:
          'Covers joins, grouping, subqueries, and common pitfalls students face in lab assignments.',
        url: 'https://example.edu/materials/sql-query-patterns',
        type: 'article',
        level: 'beginner',
        language: 'en',
        source: 'Campus Dev Notes',
        tags: ['sql', 'joins', 'group-by', 'subquery'],
        isFeatured: true,
      },
      {
        title: 'Chuan hoa du lieu 1NF den BCNF',
        description:
          'Tai lieu tieng Viet giai thich luong suy nghi khi tach bang, xac dinh phu thuoc ham va tranh du thua.',
        url: 'https://example.edu/materials/chuan-hoa-du-lieu',
        type: 'slide',
        level: 'intermediate',
        language: 'vi',
        source: 'Database Workshop',
        tags: ['normalization', '1nf', '2nf', '3nf', 'bcnf'],
        isFeatured: true,
      },
      {
        title: 'Database Lab Drill: Normalization and Query Tuning',
        description:
          'Exercise pack blending schema refactoring, indexing basics, and cost-aware SQL improvements.',
        url: 'https://example.edu/materials/database-lab-drill',
        type: 'exercise',
        level: 'advanced',
        language: 'en',
        source: 'Query Gym',
        tags: ['index', 'normalization', 'query-tuning', 'lab'],
        isFeatured: false,
      },
    ],
  },
  {
    subject: {
      slug: 'machine-learning',
      nameVi: 'Hoc may',
      nameEn: 'Machine Learning',
      description: 'Ly thuyet va thuc hanh mo hinh hoc may co ban.',
    },
    topic: {
      slug: 'supervised-learning',
      nameVi: 'Hoc co giam sat',
      nameEn: 'Supervised Learning',
    },
    materials: [
      {
        title: 'Regression and Classification Explained Simply',
        description:
          'Friendly overview of supervised learning tasks, data splits, evaluation metrics, and overfitting.',
        url: 'https://example.edu/materials/regression-classification',
        type: 'video',
        level: 'beginner',
        language: 'en',
        source: 'AI Starter Lab',
        tags: ['classification', 'regression', 'evaluation', 'overfitting'],
        isFeatured: true,
      },
      {
        title: 'Cheat sheet metrics cho hoc may',
        description:
          'Tong hop accuracy, precision, recall, F1-score, confusion matrix va cach doc nhanh ket qua mo hinh.',
        url: 'https://example.edu/materials/ml-metrics-cheatsheet',
        type: 'pdf',
        level: 'intermediate',
        language: 'vi',
        source: 'ML Study Group',
        tags: ['metrics', 'precision', 'recall', 'f1', 'confusion-matrix'],
        isFeatured: true,
      },
      {
        title: 'Mini Project Guide: Build Your First ML Baseline',
        description:
          'Project-oriented guide for preparing data, training a baseline, and reporting results responsibly.',
        url: 'https://example.edu/materials/ml-baseline-project',
        type: 'textbook',
        level: 'advanced',
        language: 'en',
        source: 'Applied ML Workshop',
        tags: ['baseline', 'project', 'dataset', 'training', 'reporting'],
        isFeatured: false,
      },
    ],
  },
];

async function main() {
  await prisma.aiProviderConfig.upsert({
    where: { provider: ProviderKey.GEMINI },
    update: {
      enabled: true,
      isPrimary: true,
      model: 'gemini-2.5-flash',
      timeoutMs: 25000,
      maxRetries: 1,
    },
    create: {
      provider: ProviderKey.GEMINI,
      enabled: true,
      isPrimary: true,
      model: 'gemini-2.5-flash',
      timeoutMs: 25000,
      maxRetries: 1,
    },
  });

  await prisma.aiProviderConfig.upsert({
    where: { provider: ProviderKey.OPENAI },
    update: {
      enabled: true,
      isPrimary: false,
      model: 'gpt-5.4-mini',
      timeoutMs: 25000,
      maxRetries: 1,
    },
    create: {
      provider: ProviderKey.OPENAI,
      enabled: true,
      isPrimary: false,
      model: 'gpt-5.4-mini',
      timeoutMs: 25000,
      maxRetries: 1,
    },
  });

  for (const seed of materialsSeed) {
    const subject = await prisma.subject.upsert({
      where: { slug: seed.subject.slug },
      update: {
        nameVi: seed.subject.nameVi,
        nameEn: seed.subject.nameEn,
        description: seed.subject.description,
      },
      create: seed.subject,
    });

    const topic = await prisma.topic.upsert({
      where: {
        subjectId_slug: {
          subjectId: subject.id,
          slug: seed.topic.slug,
        },
      },
      update: {
        nameVi: seed.topic.nameVi,
        nameEn: seed.topic.nameEn,
      },
      create: {
        ...seed.topic,
        subjectId: subject.id,
      },
    });

    for (const material of seed.materials) {
      const materialSlug = `${subject.slug}-${topic.slug}-${material.title}`
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();

      await prisma.studyMaterial.upsert({
        where: {
          slug: materialSlug,
        },
        update: {
          slug: materialSlug,
          title: material.title,
          description: material.description,
          url: material.url,
          type: material.type,
          level: material.level,
          language: material.language,
          source: material.source,
          tags: material.tags,
          isFeatured: material.isFeatured,
          subjectId: subject.id,
          topicId: topic.id,
        },
        create: {
          slug: materialSlug,
          title: material.title,
          description: material.description,
          url: material.url,
          type: material.type,
          level: material.level,
          language: material.language,
          source: material.source,
          tags: material.tags,
          isFeatured: material.isFeatured,
          subjectId: subject.id,
          topicId: topic.id,
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
