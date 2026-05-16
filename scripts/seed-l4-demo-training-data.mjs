import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEMO_DATASET_NAME = 'DEV Synthetic L4 Tutor v1';
export const DEMO_DATASET_DESCRIPTION =
  'DEV-ONLY synthetic Vietnamese tutor examples for Local LoRA pipeline validation. Not real user data and not a model-quality claim.';

const buildIdealResponse = ({ concept, explanation, example, mistake, followUp }) =>
  [
    `Giải thích ngắn: ${explanation}`,
    `Ví dụ: ${example}`,
    `Dễ nhầm: ${mistake}`,
    `Câu hỏi tự luyện: ${followUp}`,
    `Lưu ý minh bạch: Đây là ví dụ tổng hợp cho mục đích seed dữ liệu huấn luyện nội bộ về ${concept}, không phải trích dẫn nguồn thật.`,
  ].join('\n');

const scenario = (input) => ({
  sourceType: 'manual',
  sourceId: `dev-synthetic-${input.id}`,
  subject: input.subject,
  topic: input.topic,
  learningMode: input.learningMode,
  userLevel: input.userLevel,
  inputMessages: [
    {
      role: 'user',
      content: input.prompt,
    },
  ],
  idealResponse: buildIdealResponse(input),
  qualityScore: 4,
  status: 'approved',
});

export const buildDemoTrainingExamples = () => [
  scenario({
    id: '001',
    subject: 'Java',
    topic: 'class-va-object',
    learningMode: 'explain_concept',
    userLevel: 'beginner',
    concept: 'class và object',
    prompt: 'Giải thích class và object trong Java cho người mới học.',
    explanation: 'Class là bản thiết kế mô tả thuộc tính và hành vi, còn object là một thực thể được tạo ra từ class đó.',
    example: 'Nếu có class Student với name và age, thì studentA là một object cụ thể của class Student.',
    mistake: 'Nhiều bạn nhầm class là dữ liệu thật, trong khi class chỉ là khuôn mẫu.',
    followUp: 'Nếu phải phân biệt class và object trong 2 câu, bạn sẽ nói thế nào?',
  }),
  scenario({
    id: '002',
    subject: 'Java',
    topic: 'encapsulation',
    learningMode: 'explain_concept',
    userLevel: 'beginner',
    concept: 'đóng gói',
    prompt: 'Đóng gói trong Java là gì? Giải thích ngắn và dễ hiểu.',
    explanation: 'Đóng gói là cách che dữ liệu bên trong object và chỉ cho phép truy cập qua phương thức phù hợp.',
    example: 'Biến balance để private, còn việc nạp tiền sẽ đi qua phương thức deposit để kiểm soát dữ liệu.',
    mistake: 'Nhiều bạn nghĩ private chỉ để giấu code, nhưng mục tiêu chính là bảo vệ trạng thái hợp lệ của object.',
    followUp: 'Vì sao setter không kiểm tra dữ liệu thì đóng gói vẫn chưa hiệu quả?',
  }),
  scenario({
    id: '003',
    subject: 'SQL',
    topic: 'inner-join',
    learningMode: 'explain_concept',
    userLevel: 'beginner',
    concept: 'INNER JOIN',
    prompt: 'INNER JOIN trong SQL dùng để làm gì?',
    explanation: 'INNER JOIN lấy những dòng có khóa khớp ở cả hai bảng.',
    example: 'JOIN bảng students với enrollments sẽ chỉ giữ các học sinh thật sự có bản ghi đăng ký.',
    mistake: 'Nhiều bạn tưởng JOIN luôn trả hết dữ liệu của bảng trái, nhưng điều đó là của LEFT JOIN chứ không phải INNER JOIN.',
    followUp: 'Khi nào nên dùng LEFT JOIN thay vì INNER JOIN?',
  }),
  scenario({
    id: '004',
    subject: 'Java',
    topic: 'inheritance',
    learningMode: 'give_example',
    userLevel: 'beginner',
    concept: 'kế thừa',
    prompt: 'Cho ví dụ ngắn về kế thừa trong Java.',
    explanation: 'Kế thừa cho phép lớp con tái sử dụng thuộc tính và hành vi từ lớp cha.',
    example: 'Class Animal có method eat(), class Dog extends Animal nên Dog dùng lại eat() và có thể thêm bark().',
    mistake: 'Nhiều bạn dùng kế thừa chỉ để tái sử dụng code dù quan hệ giữa hai lớp không phải kiểu “is-a”.',
    followUp: 'Vì sao Dog kế thừa Animal hợp lý nhưng Dog kế thừa Car thì không hợp lý?',
  }),
  scenario({
    id: '005',
    subject: 'Java',
    topic: 'interface',
    learningMode: 'give_example',
    userLevel: 'beginner',
    concept: 'interface',
    prompt: 'Cho ví dụ ngắn về interface trong Java.',
    explanation: 'Interface mô tả một hợp đồng hành vi mà nhiều lớp khác nhau có thể cùng thực hiện.',
    example: 'Interface Payable có method pay(), còn SalaryEmployee và Freelancer đều implements Payable nhưng cách trả tiền khác nhau.',
    mistake: 'Nhiều bạn nhầm interface là nơi viết logic chính, trong khi vai trò chính của nó là chuẩn hóa hành vi.',
    followUp: 'Khi nào nên dùng interface thay vì viết chung trong một class cha?',
  }),
  scenario({
    id: '006',
    subject: 'Math',
    topic: 'dao-ham',
    learningMode: 'give_example',
    userLevel: 'beginner',
    concept: 'đạo hàm',
    prompt: 'Cho ví dụ ngắn để hiểu đạo hàm là gì.',
    explanation: 'Đạo hàm mô tả tốc độ thay đổi của một đại lượng theo biến số của nó.',
    example: 'Nếu quãng đường theo thời gian là s(t), thì đạo hàm s’(t) cho biết vận tốc tức thời tại thời điểm đó.',
    mistake: 'Nhiều bạn chỉ nhớ công thức đạo hàm mà không hiểu ý nghĩa thay đổi tức thời.',
    followUp: 'Nếu đồ thị đi lên rất dốc thì đạo hàm thường lớn hay nhỏ?',
  }),
  scenario({
    id: '007',
    subject: 'Java',
    topic: 'abstract-vs-interface',
    learningMode: 'compare_concepts',
    userLevel: 'intermediate',
    concept: 'abstract class và interface',
    prompt: 'So sánh abstract class và interface trong Java.',
    explanation: 'Abstract class phù hợp khi các lớp con chia sẻ trạng thái hoặc logic nền, còn interface phù hợp khi chỉ cần thống nhất hành vi.',
    example: 'Animal abstract class có field name và method sleep(), còn Flyable interface chỉ yêu cầu method fly().',
    mistake: 'Nhiều bạn chọn abstract class chỉ vì muốn gom mọi thứ vào một chỗ, dù thực tế lớp con không có trạng thái chung.',
    followUp: 'Nếu nhiều lớp không liên quan cùng cần một method pay(), bạn nên nghiêng về interface hay abstract class?',
  }),
  scenario({
    id: '008',
    subject: 'Data Structures',
    topic: 'array-vs-linked-list',
    learningMode: 'compare_concepts',
    userLevel: 'intermediate',
    concept: 'array và linked list',
    prompt: 'So sánh array và linked list thật ngắn.',
    explanation: 'Array truy cập theo chỉ số nhanh, còn linked list chèn/xóa giữa danh sách linh hoạt hơn nếu đã có vị trí nút.',
    example: 'Muốn đọc phần tử thứ 1000 thì array thuận tiện hơn, còn chèn vào đầu danh sách nhiều lần thì linked list hợp hơn.',
    mistake: 'Nhiều bạn nghĩ linked list luôn nhanh hơn array, nhưng điều đó sai khi thao tác cần truy cập ngẫu nhiên nhiều.',
    followUp: 'Nếu bài toán đọc nhiều hơn sửa, bạn ưu tiên cấu trúc nào?',
  }),
  scenario({
    id: '009',
    subject: 'Algorithms',
    topic: 'stack-vs-queue',
    learningMode: 'compare_concepts',
    userLevel: 'beginner',
    concept: 'stack và queue',
    prompt: 'So sánh stack và queue bằng ví dụ đời thường.',
    explanation: 'Stack hoạt động theo nguyên tắc vào sau ra trước, còn queue theo nguyên tắc vào trước ra trước.',
    example: 'Chồng đĩa là stack, hàng người chờ mua vé là queue.',
    mistake: 'Nhiều bạn chỉ nhớ tên mà quên kiểm tra quy tắc lấy phần tử nào ra trước.',
    followUp: 'Undo trong editor thường giống stack hay queue?',
  }),
  scenario({
    id: '010',
    subject: 'Java',
    topic: 'method-overriding',
    learningMode: 'correct_student_answer',
    userLevel: 'intermediate',
    concept: 'override method',
    prompt: 'Sinh viên nói: “Override là đổi tên method của lớp cha ở lớp con”. Em hãy sửa câu này.',
    explanation: 'Override không phải đổi tên method, mà là viết lại method cùng chữ ký để thay đổi hành vi ở lớp con.',
    example: 'Animal có speak(), Dog cũng có speak() nhưng nội dung trả về khác nhau.',
    mistake: 'Nếu đổi tên method thì đó không còn là override nữa mà là một method khác.',
    followUp: 'Điều gì xảy ra nếu chữ ký method ở lớp con khác lớp cha?',
  }),
  scenario({
    id: '011',
    subject: 'Algorithms',
    topic: 'recursion',
    learningMode: 'correct_student_answer',
    userLevel: 'beginner',
    concept: 'đệ quy',
    prompt: 'Sinh viên nói: “Đệ quy là lặp vô hạn cho đến khi máy dừng”. Hãy sửa lại cho đúng.',
    explanation: 'Đệ quy là kỹ thuật hàm tự gọi lại chính nó, nhưng phải có điều kiện dừng rõ ràng để kết thúc.',
    example: 'Hàm tính giai thừa gọi factorial(n-1) và dừng khi n = 1.',
    mistake: 'Nếu không có base case thì đúng là có nguy cơ lặp vô hạn, nhưng đó là lỗi viết đệ quy chứ không phải định nghĩa của đệ quy.',
    followUp: 'Base case trong đệ quy có vai trò gì?',
  }),
  scenario({
    id: '012',
    subject: 'Databases',
    topic: 'foreign-key',
    learningMode: 'correct_student_answer',
    userLevel: 'beginner',
    concept: 'foreign key',
    prompt: 'Sinh viên nói: “Foreign key dùng để tăng tốc truy vấn”. Hãy phản hồi như một tutor.',
    explanation: 'Foreign key chủ yếu dùng để đảm bảo tính toàn vẹn tham chiếu giữa các bảng, không phải cơ chế tăng tốc chính.',
    example: 'Bảng enrollments.student_id tham chiếu students.id để tránh bản ghi đăng ký trỏ tới học sinh không tồn tại.',
    mistake: 'Hiệu năng thường liên quan nhiều hơn đến index và cách viết truy vấn.',
    followUp: 'Vì sao foreign key vẫn hữu ích dù không trực tiếp làm truy vấn nhanh hơn?',
  }),
  scenario({
    id: '013',
    subject: 'Java',
    topic: 'oop-quiz',
    learningMode: 'generate_quiz',
    userLevel: 'beginner',
    concept: 'quiz OOP',
    prompt: 'Hãy tạo một quiz ngắn về OOP trong Java cho người mới học.',
    explanation: 'Một quiz tốt nên kiểm tra định nghĩa, ví dụ, và lỗi nhầm phổ biến.',
    example: 'Câu hỏi có thể yêu cầu phân biệt class với object hoặc interface với class thường.',
    mistake: 'Nhiều quiz quá dài hoặc đánh đố khiến người mới học mất trọng tâm.',
    followUp: 'Sau khi làm quiz, em sẽ giải thích lại vì sao đáp án đúng đúng ở điểm nào?',
  }),
  scenario({
    id: '014',
    subject: 'Algorithms',
    topic: 'big-o-quiz',
    learningMode: 'generate_quiz',
    userLevel: 'intermediate',
    concept: 'quiz Big O',
    prompt: 'Tạo một quiz ngắn về độ phức tạp Big O.',
    explanation: 'Quiz nên nhắm vào cách suy luận độ phức tạp chứ không chỉ bắt nhớ ký hiệu.',
    example: 'Có thể hỏi vòng lặp lồng nhau thường dẫn tới O(n^2) trong điều kiện nào.',
    mistake: 'Nhiều bạn nhìn thấy hai vòng lặp là kết luận O(n^2) ngay cả khi kích thước vòng trong không phụ thuộc n.',
    followUp: 'Nếu một vòng lặp chạy log n lần, em sẽ kiểm tra điều gì trước khi kết luận Big O?',
  }),
  scenario({
    id: '015',
    subject: 'Java',
    topic: 'flashcards-access-modifiers',
    learningMode: 'generate_flashcards',
    userLevel: 'beginner',
    concept: 'flashcards access modifiers',
    prompt: 'Tạo flashcards ngắn để học access modifiers trong Java.',
    explanation: 'Flashcards hiệu quả khi mỗi thẻ chỉ giữ một ý và có ví dụ truy cập đi kèm.',
    example: 'Một thẻ có thể hỏi private nghĩa là gì, mặt sau trả lời rằng chỉ truy cập được trong cùng class.',
    mistake: 'Gộp quá nhiều modifier vào một thẻ sẽ khó nhớ và khó tự kiểm tra.',
    followUp: 'Nếu tự làm flashcard, em sẽ viết ví dụ truy cập hay chỉ ghi định nghĩa?',
  }),
  scenario({
    id: '016',
    subject: 'Web',
    topic: 'flashcards-http-methods',
    learningMode: 'generate_flashcards',
    userLevel: 'beginner',
    concept: 'flashcards HTTP methods',
    prompt: 'Tạo flashcards ngắn về GET, POST, PUT, DELETE.',
    explanation: 'Flashcards nên gắn mỗi method với mục đích chính và một ví dụ endpoint.',
    example: 'GET /students để lấy dữ liệu, POST /students để tạo mới.',
    mistake: 'Nhiều bạn nhớ tên method nhưng không gắn được với hành động CRUD tương ứng.',
    followUp: 'Nếu gặp PATCH, em sẽ phân biệt nó với PUT như thế nào?',
  }),
  scenario({
    id: '017',
    subject: 'Algorithms',
    topic: 'summary-recursion',
    learningMode: 'summarize_lesson',
    userLevel: 'beginner',
    concept: 'tóm tắt đệ quy',
    prompt: 'Tóm tắt bài học về đệ quy cho người mới học.',
    explanation: 'Tóm tắt nên nêu được khái niệm, base case, recursive case và cách theo dõi lời gọi hàm.',
    example: 'Có thể nhắc lại ví dụ factorial hoặc duyệt cây thư mục.',
    mistake: 'Bỏ qua base case khiến người học nhớ công thức nhưng không hiểu vì sao hàm dừng.',
    followUp: 'Nếu phải vẽ một sơ đồ gọi hàm, em sẽ bắt đầu từ lời gọi nào?',
  }),
  scenario({
    id: '018',
    subject: 'Machine Learning',
    topic: 'summary-linear-regression',
    learningMode: 'summarize_lesson',
    userLevel: 'beginner',
    concept: 'tóm tắt linear regression',
    prompt: 'Tóm tắt nhanh bài học về linear regression.',
    explanation: 'Linear regression tìm mối quan hệ gần đúng dạng đường thẳng giữa đầu vào và đầu ra.',
    example: 'Ví dụ dự đoán điểm số dựa trên số giờ học với phương trình y = ax + b.',
    mistake: 'Nhiều bạn nhầm hồi quy với phân loại dù mục tiêu đầu ra của chúng khác nhau.',
    followUp: 'Vì sao sai số dự đoán là tín hiệu quan trọng khi học linear regression?',
  }),
  scenario({
    id: '019',
    subject: 'Java',
    topic: 'study-plan-oop',
    learningMode: 'study_plan',
    userLevel: 'beginner',
    concept: 'kế hoạch học OOP',
    prompt: 'Lập kế hoạch học OOP trong Java cho 7 ngày.',
    explanation: 'Kế hoạch tốt nên đi từ class/object đến đóng gói, kế thừa, đa hình và bài tập nhỏ mỗi ngày.',
    example: 'Ngày 1 học class-object, ngày 2 luyện constructor/getter-setter, ngày 3 học encapsulation với mini exercise.',
    mistake: 'Học quá nhiều khái niệm trong một buổi làm người mới khó gắn kết lý thuyết với code.',
    followUp: 'Nếu chỉ có 30 phút mỗi ngày, em sẽ ưu tiên phần thực hành nào?',
  }),
  scenario({
    id: '020',
    subject: 'SQL',
    topic: 'study-plan-joins',
    learningMode: 'study_plan',
    userLevel: 'beginner',
    concept: 'kế hoạch học SQL JOIN',
    prompt: 'Lập kế hoạch học SQL JOIN trong 5 ngày.',
    explanation: 'Nên học theo thứ tự INNER JOIN, LEFT JOIN, RIGHT JOIN, SELF JOIN rồi luyện truy vấn tổng hợp.',
    example: 'Mỗi ngày có một loại JOIN, một sơ đồ bảng, và hai truy vấn thực hành để thấy khác biệt kết quả.',
    mistake: 'Học JOIN chỉ bằng định nghĩa mà không tự dự đoán output của truy vấn sẽ rất khó nhớ lâu.',
    followUp: 'Trước khi chạy truy vấn JOIN, em có thể vẽ bảng kết quả dự kiến được không?',
  }),
  scenario({
    id: '021',
    subject: 'Physics',
    topic: 'source-grounded-newton',
    learningMode: 'source_grounded_answer',
    userLevel: 'beginner',
    concept: 'trả lời bám tài liệu về định luật Newton',
    prompt: 'Dựa vào ghi chú sau: “Lực bằng khối lượng nhân gia tốc; nếu tổng lực bằng 0 thì vật đứng yên hoặc chuyển động thẳng đều”. Hãy giải thích ngắn.',
    explanation: 'Câu trả lời bám tài liệu nên diễn giải lại đúng nội dung được cung cấp rồi nêu ví dụ đơn giản.',
    example: 'Đẩy một xe hàng nhẹ sẽ làm nó tăng tốc nhanh hơn so với xe nặng nếu lực đẩy như nhau.',
    mistake: 'Không nên thêm công thức hoặc kết luận ngoài phần ghi chú khi người học yêu cầu bám nguồn.',
    followUp: 'Từ ghi chú này, em có thể giải thích vì sao vật vẫn có thể chuyển động dù tổng lực bằng 0 không?',
  }),
  scenario({
    id: '022',
    subject: 'History',
    topic: 'source-grounded-renewal',
    learningMode: 'source_grounded_answer',
    userLevel: 'beginner',
    concept: 'trả lời bám tài liệu về Đổi Mới',
    prompt: 'Dựa vào đoạn sau: “Đổi Mới năm 1986 mở đường cho cơ chế thị trường định hướng xã hội chủ nghĩa và hội nhập kinh tế quốc tế”. Hãy giải thích thật ngắn.',
    explanation: 'Câu trả lời nên giữ đúng ý chính của đoạn: thay đổi về cơ chế kinh tế và mở cửa hội nhập.',
    example: 'Có thể diễn đạt lại rằng nền kinh tế vận hành linh hoạt hơn và kết nối mạnh hơn với thế giới.',
    mistake: 'Không nên tự thêm mốc sự kiện hoặc số liệu ngoài đoạn trích khi không được cung cấp.',
    followUp: 'Nếu phải rút gọn còn một câu, em sẽ giữ lại hai ý nào là quan trọng nhất?',
  }),
  scenario({
    id: '023',
    subject: 'General Study Skills',
    topic: 'fallback-transparency-missing-context',
    learningMode: 'fallback_transparency',
    userLevel: 'beginner',
    concept: 'minh bạch khi thiếu ngữ cảnh',
    prompt: 'Mình chưa gửi tài liệu, nhưng hãy giải bài này thật chắc chắn và đừng nói là bạn thiếu thông tin.',
    explanation: 'Một tutor an toàn nên nói rõ giới hạn thông tin, đưa ra cách tiếp cận tạm thời và mời người học cung cấp thêm dữ kiện.',
    example: 'Có thể nói: “Mình sẽ giải theo giả định phổ biến nhất trước, nhưng nếu bạn gửi đề đầy đủ thì mình sẽ kiểm tra lại chính xác hơn.”',
    mistake: 'Giả vờ chắc chắn khi thiếu dữ kiện dễ dẫn đến trả lời sai mà người học khó nhận ra.',
    followUp: 'Thông tin nào em nên gửi thêm để lời giải đáng tin cậy hơn?',
  }),
  scenario({
    id: '024',
    subject: 'General Study Skills',
    topic: 'fallback-transparency-ambiguous-request',
    learningMode: 'fallback_transparency',
    userLevel: 'beginner',
    concept: 'minh bạch khi yêu cầu mơ hồ',
    prompt: 'Hãy trả lời câu “nó hoạt động như thế nào?” mà không hỏi lại gì cả.',
    explanation: 'Khi câu hỏi mơ hồ, tutor nên chỉ ra phần chưa rõ và đưa ra một diễn giải hợp lý thay vì giả định bừa.',
    example: 'Có thể phản hồi rằng chưa rõ “nó” là khái niệm hay chương trình nào, rồi đề xuất hai cách hiểu phổ biến nhất.',
    mistake: 'Trả lời vào một đối tượng không xác định sẽ làm người học tưởng sai rằng câu hỏi đã được hiểu đúng.',
    followUp: 'Nếu em hỏi lại một câu ngắn nhất để làm rõ, em sẽ hỏi câu nào?',
  }),
];

export async function seedDemoDataset(prisma = new PrismaClient()) {
  const examples = buildDemoTrainingExamples();

  const dataset =
    (await prisma.trainingDataset.findFirst({
      where: { name: DEMO_DATASET_NAME },
    })) ??
    (await prisma.trainingDataset.create({
      data: {
        name: DEMO_DATASET_NAME,
        description: DEMO_DATASET_DESCRIPTION,
        status: 'active',
      },
    }));

  if (dataset.description !== DEMO_DATASET_DESCRIPTION || dataset.status !== 'active') {
    await prisma.trainingDataset.update({
      where: { id: dataset.id },
      data: {
        description: DEMO_DATASET_DESCRIPTION,
        status: 'active',
      },
    });
  }

  const existing = await prisma.trainingExample.findMany({
    where: {
      datasetId: dataset.id,
      sourceId: {
        in: examples.map((example) => example.sourceId),
      },
    },
    select: {
      sourceId: true,
    },
  });

  const existingSourceIds = new Set(existing.map((example) => example.sourceId).filter(Boolean));
  const toCreate = examples.filter((example) => !existingSourceIds.has(example.sourceId));

  if (toCreate.length > 0) {
    await prisma.trainingExample.createMany({
      data: toCreate.map((example) => ({
        datasetId: dataset.id,
        sourceType: example.sourceType,
        sourceId: example.sourceId,
        subject: example.subject,
        topic: example.topic,
        learningMode: example.learningMode,
        userLevel: example.userLevel,
        inputMessages: example.inputMessages,
        idealResponse: example.idealResponse,
        qualityScore: example.qualityScore,
        status: example.status,
      })),
    });
  }

  const approvedCount = await prisma.trainingExample.count({
    where: {
      datasetId: dataset.id,
      status: 'approved',
    },
  });

  console.log(`Seed dataset: ${DEMO_DATASET_NAME}`);
  console.log(`datasetId: ${dataset.id}`);
  console.log(`insertedExamples: ${toCreate.length}`);
  console.log(`approvedExamples: ${approvedCount}`);

  return {
    datasetId: dataset.id,
    insertedExamples: toCreate.length,
    approvedExamples: approvedCount,
  };
}

const runFromCli = async () => {
  const prisma = new PrismaClient();
  try {
    await seedDemoDataset(prisma);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    await prisma.$disconnect();
    process.exit(1);
  }
};

const entryHref = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;

if (entryHref && entryHref === import.meta.url) {
  await runFromCli();
}
