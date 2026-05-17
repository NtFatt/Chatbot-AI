import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prisma = new PrismaClient();
const CASE_PREFIX = 'Phase 9 - ';

const buildScoringNotes = (meta) =>
  JSON.stringify(
    {
      difficulty: meta.difficulty,
      targetOutputShape: meta.targetOutputShape,
      maxResponseChars: meta.maxResponseChars,
      expectedKeyPoints: meta.expectedKeyPoints,
      avoid: meta.avoid,
    },
    null,
    2,
  );

const createCase = ({
  slug,
  title,
  description,
  category,
  difficulty,
  prompt,
  idealResponse,
  targetOutputShape,
  maxResponseChars,
  expectedKeyPoints,
  avoid = ['fake_citations', 'external_provider_wording', 'excessive_markdown'],
}) => ({
  name: `${CASE_PREFIX}${title}`,
  description,
  category,
  inputMessages: [{ role: 'user', content: prompt }],
  idealResponse,
  scoringNotes: buildScoringNotes({
    difficulty,
    targetOutputShape,
    maxResponseChars,
    expectedKeyPoints,
    avoid,
    slug,
  }),
});

export const PHASE9_EVAL_CASES = [
  createCase({
    slug: 'explain-concept-encapsulation',
    title: 'Explain Concept - Encapsulation',
    description: 'Vietnamese concept explanation with one example, one common mistake, and one practice question.',
    category: 'explain_concept',
    difficulty: 'beginner',
    prompt: 'Giải thích tính đóng gói trong Java cho người mới. Trả lời thật ngắn, có ví dụ và 1 câu tự luyện.',
    idealResponse:
      '- Đóng gói là giấu dữ liệu bên trong object và chỉ cho phép truy cập qua phương thức phù hợp.\n- Ví dụ: balance để private, chỉ đổi qua deposit().\n- Dễ nhầm: public getter/setter cho mọi thứ không phải lúc nào cũng tốt.\n- Tự luyện: Vì sao password không nên có getter trả thẳng giá trị?',
    targetOutputShape: '4 bullets',
    maxResponseChars: 420,
    expectedKeyPoints: ['definition', 'short Java example', 'common mistake', 'practice question'],
  }),
  createCase({
    slug: 'explain-concept-recursion',
    title: 'Explain Concept - Recursion',
    description: 'Recursive concept explanation in concise Vietnamese.',
    category: 'explain_concept',
    difficulty: 'intermediate',
    prompt: 'Giải thích đệ quy thật ngắn, dễ hiểu. Có ví dụ nhỏ và nhắc 1 lỗi thường gặp.',
    idealResponse:
      '- Đệ quy là hàm tự gọi lại chính nó để giải bài toán lớn bằng bài toán nhỏ hơn.\n- Ví dụ: factorial(3) = 3 * factorial(2).\n- Lỗi hay gặp: quên điều kiện dừng nên hàm chạy mãi.\n- Tự luyện: Hàm nào dễ dùng vòng lặp hơn đệ quy?',
    targetOutputShape: '4 bullets',
    maxResponseChars: 400,
    expectedKeyPoints: ['definition', 'small example', 'common mistake', 'practice question'],
  }),
  createCase({
    slug: 'explain-concept-normalization',
    title: 'Explain Concept - Database Normalization',
    description: 'Short DB normalization explanation with student-friendly framing.',
    category: 'explain_concept',
    difficulty: 'intermediate',
    prompt: 'Giải thích chuẩn hóa dữ liệu trong CSDL thật ngắn, có ví dụ và 1 câu hỏi tự luyện.',
    idealResponse:
      '- Chuẩn hóa là tổ chức bảng để giảm lặp dữ liệu và giảm lỗi cập nhật.\n- Ví dụ: tách bảng SinhVien và Lop thay vì lặp tên lớp ở mọi dòng.\n- Dễ nhầm: chuẩn hóa không có nghĩa là càng tách nhiều bảng càng tốt.\n- Tự luyện: Khi nào nên cân nhắc denormalization?',
    targetOutputShape: '4 bullets',
    maxResponseChars: 430,
    expectedKeyPoints: ['definition', 'database example', 'common mistake', 'practice question'],
  }),
  createCase({
    slug: 'give-example-python-dict',
    title: 'Give Example - Python Dictionary',
    description: 'Concrete Python dictionary example with why it fits.',
    category: 'give_example',
    difficulty: 'beginner',
    prompt: 'Cho mình một ví dụ ngắn về dictionary trong Python, nói luôn vì sao ví dụ đó đúng.',
    idealResponse:
      '- Ví dụ: student = {"name": "Lan", "age": 19}.\n- Nó đúng vì dictionary lưu dữ liệu theo cặp key-value.\n- Dễ nhầm: dictionary không truy cập bằng chỉ số như list.\n- Tự luyện: Nếu muốn thêm GPA thì viết key nào?',
    targetOutputShape: '4 bullets',
    maxResponseChars: 360,
    expectedKeyPoints: ['concrete example', 'why it fits', 'common mistake', 'practice question'],
  }),
  createCase({
    slug: 'give-example-java-interface',
    title: 'Give Example - Java Interface',
    description: 'Short Java interface example.',
    category: 'give_example',
    difficulty: 'intermediate',
    prompt: 'Cho ví dụ ngắn về interface trong Java và nói vì sao ví dụ đó hợp lý.',
    idealResponse:
      '- Ví dụ: interface Payable { void pay(); } và class Invoice implements Payable.\n- Ví dụ này hợp lý vì interface mô tả hành vi chung, còn class tự cài đặt chi tiết.\n- Dễ nhầm: interface không phải nơi để chứa state nghiệp vụ chính.\n- Tự luyện: Em sẽ thêm class nào nữa cùng implements Payable?',
    targetOutputShape: '4 bullets',
    maxResponseChars: 420,
    expectedKeyPoints: ['short Java example', 'why it fits', 'common mistake', 'practice question'],
  }),
  createCase({
    slug: 'give-example-sql-index',
    title: 'Give Example - SQL Index',
    description: 'Short SQL index example with trade-off reminder.',
    category: 'give_example',
    difficulty: 'intermediate',
    prompt: 'Cho ví dụ ngắn khi nên tạo index trong SQL và giải thích vì sao.',
    idealResponse:
      '- Ví dụ: tạo index cho cột email khi hay tìm user theo email.\n- Hợp lý vì truy vấn đọc nhanh hơn ở cột lọc thường xuyên.\n- Dễ nhầm: index nào cũng tốt; thật ra ghi dữ liệu sẽ tốn thêm chi phí.\n- Tự luyện: Nếu bảng ghi log liên tục thì em có index mọi cột không?',
    targetOutputShape: '4 bullets',
    maxResponseChars: 430,
    expectedKeyPoints: ['concrete example', 'why it fits', 'trade-off', 'practice question'],
  }),
  createCase({
    slug: 'compare-get-post',
    title: 'Compare Concepts - GET vs POST',
    description: 'Short direct comparison with one quick example.',
    category: 'compare_concepts',
    difficulty: 'beginner',
    prompt: 'So sánh GET và POST thật ngắn, dễ hiểu. Có 1 ví dụ tình huống dùng mỗi loại.',
    idealResponse:
      '- GET chủ yếu để lấy dữ liệu, còn POST chủ yếu để gửi dữ liệu tạo hoặc xử lý.\n- GET thường lộ tham số trên URL, POST để dữ liệu trong body.\n- Ví dụ: GET để xem danh sách sách, POST để gửi form đăng ký.\n- Tự luyện: Upload file thường nghiêng về GET hay POST?',
    targetOutputShape: '4 bullets',
    maxResponseChars: 380,
    expectedKeyPoints: ['clear contrast', 'URL vs body', 'use-case example', 'practice question'],
  }),
  createCase({
    slug: 'compare-arraylist-linkedlist',
    title: 'Compare Concepts - ArrayList vs LinkedList',
    description: 'Short DS comparison in Vietnamese.',
    category: 'compare_concepts',
    difficulty: 'intermediate',
    prompt: 'So sánh ArrayList và LinkedList ngắn gọn. Nêu khi nào mỗi loại hợp hơn.',
    idealResponse:
      '- ArrayList truy cập theo chỉ số nhanh hơn, LinkedList chèn/xóa giữa danh sách linh hoạt hơn.\n- ArrayList hợp khi đọc nhiều; LinkedList hợp khi thay đổi cấu trúc thường xuyên.\n- Dễ nhầm: LinkedList không phải lúc nào cũng nhanh hơn.\n- Tự luyện: Danh sách menu web đọc nhiều nên ưu tiên loại nào?',
    targetOutputShape: '4 bullets',
    maxResponseChars: 410,
    expectedKeyPoints: ['contrast', 'when to use each', 'common mistake', 'practice question'],
  }),
  createCase({
    slug: 'compare-abstract-interface',
    title: 'Compare Concepts - Abstract Class vs Interface',
    description: 'Short OOP comparison with practical distinction.',
    category: 'compare_concepts',
    difficulty: 'intermediate',
    prompt: 'So sánh abstract class và interface thật ngắn, có ví dụ dùng.',
    idealResponse:
      '- Abstract class hợp khi các class con chia sẻ state hoặc logic chung; interface hợp khi chỉ cần cam kết hành vi.\n- Ví dụ: Animal abstract class, còn Payable là interface.\n- Dễ nhầm: interface không thay thế hoàn toàn abstract class.\n- Tự luyện: Nếu nhiều class cần cùng method pay() nhưng khác nội dung, em nghiêng về gì?',
    targetOutputShape: '4 bullets',
    maxResponseChars: 430,
    expectedKeyPoints: ['contrast', 'example', 'common mistake', 'practice question'],
  }),
  createCase({
    slug: 'correct-binary-search',
    title: 'Correct Student Answer - Binary Search',
    description: 'Correct a wrong claim and explain why.',
    category: 'correct_student_answer',
    difficulty: 'beginner',
    prompt: 'Một bạn nói: "Mảng chưa sắp xếp vẫn tìm kiếm nhị phân được nếu chọn điểm giữa hợp lý." Hãy sửa ngắn gọn.',
    idealResponse:
      '- Câu đó chưa đúng.\n- Tìm kiếm nhị phân cần dữ liệu đã sắp xếp; nếu chưa có thứ tự thì bỏ nửa mảng sẽ không còn đáng tin.\n- Ví dụ nhanh: mảng 7, 1, 5 không cho phép suy ra nửa nào bỏ.\n- Tự luyện: Nếu mảng chưa sắp xếp thì nên dùng cách tìm nào trước?',
    targetOutputShape: '4 bullets',
    maxResponseChars: 420,
    expectedKeyPoints: ['explicit correction', 'reason', 'small example', 'practice question'],
  }),
  createCase({
    slug: 'correct-oop-overriding',
    title: 'Correct Student Answer - Overriding',
    description: 'Correct an OOP misconception.',
    category: 'correct_student_answer',
    difficulty: 'intermediate',
    prompt: 'Một bạn nói: "Override là đổi tên method ở class con cho khác class cha." Hãy sửa ngắn gọn.',
    idealResponse:
      '- Câu đó sai.\n- Override là giữ cùng tên, cùng tham số, rồi viết lại cách hoạt động ở class con.\n- Dễ nhầm: đổi tên method là tạo method mới chứ không phải override.\n- Tự luyện: Nếu chỉ khác kiểu tham số thì gọi là override hay overload?',
    targetOutputShape: '4 bullets',
    maxResponseChars: 380,
    expectedKeyPoints: ['explicit correction', 'reason', 'common mistake', 'practice question'],
  }),
  createCase({
    slug: 'correct-ml-overfitting',
    title: 'Correct Student Answer - Overfitting',
    description: 'Correct an ML misconception in concise Vietnamese.',
    category: 'correct_student_answer',
    difficulty: 'intermediate',
    prompt: 'Một bạn nói: "Train accuracy càng gần 100% thì model càng chắc chắn tốt." Hãy sửa ngắn gọn.',
    idealResponse:
      '- Câu đó chưa đủ đúng.\n- Train accuracy rất cao vẫn có thể là overfitting nếu validation/test kém.\n- Dễ nhầm: nhìn một chỉ số train rồi kết luận chất lượng tổng thể.\n- Tự luyện: Em cần xem thêm chỉ số nào ngoài train accuracy?',
    targetOutputShape: '4 bullets',
    maxResponseChars: 360,
    expectedKeyPoints: ['explicit correction', 'reason', 'common mistake', 'practice question'],
  }),
  createCase({
    slug: 'quiz-sql-join',
    title: 'Generate Quiz - SQL JOIN',
    description: 'Two short MCQ questions with answer key.',
    category: 'generate_quiz',
    difficulty: 'intermediate',
    prompt: 'Tạo 2 câu quiz trắc nghiệm ngắn về JOIN trong SQL. Mỗi câu 4 lựa chọn A-D và có đáp án.',
    idealResponse:
      'Câu 1: INNER JOIN dùng để làm gì?\nA. Lấy mọi dòng kể cả không khớp\nB. Chỉ lấy các dòng khớp ở hai bảng\nC. Xóa dữ liệu trùng\nD. Tạo index\nĐáp án: B\n\nCâu 2: LEFT JOIN giữ lại điều gì?\nA. Chỉ bảng phải\nB. Chỉ dòng khớp\nC. Toàn bộ bảng trái kể cả khi không khớp\nD. Chỉ cột khóa\nĐáp án: C',
    targetOutputShape: '2 MCQ questions + answer key',
    maxResponseChars: 460,
    expectedKeyPoints: ['2 questions', 'A-D choices', 'answer key', 'JOIN meaning'],
  }),
  createCase({
    slug: 'quiz-big-o',
    title: 'Generate Quiz - Big O',
    description: 'Two concise MCQ questions about Big O.',
    category: 'generate_quiz',
    difficulty: 'beginner',
    prompt: 'Tạo 2 câu quiz trắc nghiệm ngắn về Big O. Có đáp án, không giải thích dài.',
    idealResponse:
      'Câu 1: O(log n) thường tăng chậm hơn loại nào?\nA. O(1)\nB. O(n)\nC. O(0)\nD. O(-1)\nĐáp án: B\n\nCâu 2: Big O chủ yếu mô tả điều gì?\nA. Tốc độ tăng chi phí khi input lớn dần\nB. Tên biến trong code\nC. Màu giao diện\nD. Cú pháp import\nĐáp án: A',
    targetOutputShape: '2 MCQ questions + answer key',
    maxResponseChars: 420,
    expectedKeyPoints: ['2 questions', 'A-D choices', 'answer key', 'concise'],
  }),
  createCase({
    slug: 'quiz-http-status',
    title: 'Generate Quiz - HTTP Status',
    description: 'HTTP status quiz with compact formatting.',
    category: 'generate_quiz',
    difficulty: 'beginner',
    prompt: 'Tạo 2 câu quiz ngắn về mã trạng thái HTTP. Mỗi câu 4 lựa chọn và có đáp án.',
    idealResponse:
      'Câu 1: 404 thường nghĩa là gì?\nA. Thành công\nB. Không tìm thấy tài nguyên\nC. Lỗi xác thực token\nD. Server tắt vĩnh viễn\nĐáp án: B\n\nCâu 2: 500 là nhóm lỗi nào?\nA. Client error\nB. Redirect\nC. Server error\nD. Success\nĐáp án: C',
    targetOutputShape: '2 MCQ questions + answer key',
    maxResponseChars: 410,
    expectedKeyPoints: ['2 questions', 'A-D choices', 'answer key', 'HTTP basics'],
  }),
  createCase({
    slug: 'flashcards-stack',
    title: 'Generate Flashcards - Stack',
    description: 'Three short flashcards with Q/A pairs.',
    category: 'generate_flashcards',
    difficulty: 'beginner',
    prompt: 'Tạo 3 flashcard ngắn để học stack. Mỗi flashcard có Hỏi và Đáp.',
    idealResponse:
      '- Hỏi: Stack hoạt động theo nguyên tắc nào? | Đáp: LIFO.\n- Hỏi: Ví dụ gần gũi của stack? | Đáp: Undo trong editor.\n- Hỏi: Dễ nhầm stack với gì? | Đáp: Queue vì queue là FIFO.',
    targetOutputShape: '3 Q/A flashcards',
    maxResponseChars: 340,
    expectedKeyPoints: ['3 cards', 'Q/A shape', 'LIFO', 'example', 'common confusion'],
  }),
  createCase({
    slug: 'flashcards-normalization',
    title: 'Generate Flashcards - Normalization',
    description: 'Three DB normalization flashcards.',
    category: 'generate_flashcards',
    difficulty: 'intermediate',
    prompt: 'Tạo 3 flashcard ngắn để học chuẩn hóa dữ liệu. Có Hỏi và Đáp rõ ràng.',
    idealResponse:
      '- Hỏi: Mục tiêu của chuẩn hóa là gì? | Đáp: Giảm lặp dữ liệu và lỗi cập nhật.\n- Hỏi: Ví dụ dấu hiệu chưa chuẩn hóa? | Đáp: Một thông tin lớp bị lặp ở nhiều dòng sinh viên.\n- Hỏi: Dễ nhầm điều gì? | Đáp: Tưởng rằng cứ tách bảng càng nhiều càng tốt.',
    targetOutputShape: '3 Q/A flashcards',
    maxResponseChars: 380,
    expectedKeyPoints: ['3 cards', 'Q/A shape', 'goal', 'example', 'common confusion'],
  }),
  createCase({
    slug: 'flashcards-dp',
    title: 'Generate Flashcards - Dynamic Programming',
    description: 'Three short DP flashcards.',
    category: 'generate_flashcards',
    difficulty: 'advanced',
    prompt: 'Tạo 3 flashcard ngắn về dynamic programming. Mỗi thẻ phải có Hỏi và Đáp.',
    idealResponse:
      '- Hỏi: DP hữu ích khi nào? | Đáp: Khi bài toán có subproblem lặp lại.\n- Hỏi: Memoization là gì? | Đáp: Lưu kết quả bài toán con để dùng lại.\n- Hỏi: Dễ nhầm DP với gì? | Đáp: Chia để trị, vì không phải bài chia để trị nào cũng có subproblem trùng.',
    targetOutputShape: '3 Q/A flashcards',
    maxResponseChars: 380,
    expectedKeyPoints: ['3 cards', 'Q/A shape', 'subproblems', 'memoization', 'common confusion'],
  }),
  createCase({
    slug: 'summary-big-o',
    title: 'Summarize Lesson - Big O',
    description: 'Very short structured lesson summary.',
    category: 'summarize_lesson',
    difficulty: 'beginner',
    prompt: 'Tóm tắt thật ngắn bài Big O thành 3 ý chính bằng tiếng Việt.',
    idealResponse:
      '- Big O mô tả tốc độ tăng chi phí khi dữ liệu lớn dần.\n- O(log n) thường mở rộng tốt hơn O(n).\n- Big O hữu ích để so sánh xu hướng, không thay thế hoàn toàn đo thời gian thực.',
    targetOutputShape: '3 bullets',
    maxResponseChars: 300,
    expectedKeyPoints: ['3 main ideas', 'bullet format', 'growth-rate framing'],
  }),
  createCase({
    slug: 'summary-rest',
    title: 'Summarize Lesson - REST API',
    description: 'Short REST summary with 3 bullet points.',
    category: 'summarize_lesson',
    difficulty: 'beginner',
    prompt: 'Tóm tắt ngắn bài REST API thành 3 ý chính, không viết lan man.',
    idealResponse:
      '- REST dùng HTTP để làm việc với tài nguyên qua URL.\n- Các method như GET, POST, PUT, DELETE thường gắn với hành động khác nhau.\n- API nên rõ ràng, nhất quán và trả mã trạng thái phù hợp.',
    targetOutputShape: '3 bullets',
    maxResponseChars: 300,
    expectedKeyPoints: ['3 main ideas', 'bullet format', 'concise'],
  }),
  createCase({
    slug: 'summary-overfitting',
    title: 'Summarize Lesson - Overfitting',
    description: 'ML summary that stays concise and structured.',
    category: 'summarize_lesson',
    difficulty: 'intermediate',
    prompt: 'Tóm tắt rất ngắn khái niệm overfitting thành 3 ý chính.',
    idealResponse:
      '- Overfitting là mô hình học quá sát dữ liệu train nên kém tổng quát hóa.\n- Dấu hiệu thường là train tốt nhưng validation/test kém.\n- Cách giảm gồm regularization, thêm dữ liệu, hoặc early stopping.',
    targetOutputShape: '3 bullets',
    maxResponseChars: 300,
    expectedKeyPoints: ['definition', 'symptom', 'mitigation', 'bullet format'],
  }),
  createCase({
    slug: 'study-plan-overfitting',
    title: 'Study Plan - Overfitting',
    description: 'Three-day study plan with day-by-day steps.',
    category: 'study_plan',
    difficulty: 'intermediate',
    prompt: 'Lập kế hoạch học 3 ngày để ôn overfitting. Mỗi ngày 1-2 việc ngắn.',
    idealResponse:
      'Ngày 1: hiểu định nghĩa overfitting và dấu hiệu train/validation lệch nhau.\nNgày 2: xem ví dụ learning curve và regularization.\nNgày 3: tự giải thích lại khái niệm và trả lời 2 câu hỏi kiểm tra ngắn.',
    targetOutputShape: '3 day plan',
    maxResponseChars: 320,
    expectedKeyPoints: ['day 1', 'day 2', 'day 3', 'practical study actions'],
  }),
  createCase({
    slug: 'study-plan-sql',
    title: 'Study Plan - SQL JOIN',
    description: 'Three-day SQL JOIN review plan.',
    category: 'study_plan',
    difficulty: 'beginner',
    prompt: 'Lập kế hoạch học 3 ngày để ôn JOIN trong SQL cho người mới.',
    idealResponse:
      'Ngày 1: ôn INNER JOIN và tự viết 2 truy vấn đơn giản.\nNgày 2: học LEFT JOIN và so sánh với INNER JOIN bằng ví dụ.\nNgày 3: làm 3 câu quiz ngắn và tự giải thích khi nào nên dùng từng loại.',
    targetOutputShape: '3 day plan',
    maxResponseChars: 320,
    expectedKeyPoints: ['day 1', 'day 2', 'day 3', 'practical study actions'],
  }),
  createCase({
    slug: 'study-plan-recursion',
    title: 'Study Plan - Recursion',
    description: 'Three-day recursion review plan.',
    category: 'study_plan',
    difficulty: 'intermediate',
    prompt: 'Lập kế hoạch học 3 ngày để hiểu đệ quy, trả lời ngắn gọn.',
    idealResponse:
      'Ngày 1: hiểu điều kiện dừng và tự mô phỏng factorial.\nNgày 2: so sánh đệ quy với vòng lặp bằng 1 ví dụ.\nNgày 3: luyện 2 bài cơ bản như tính tổng và Fibonacci phiên bản memoization.',
    targetOutputShape: '3 day plan',
    maxResponseChars: 330,
    expectedKeyPoints: ['day 1', 'day 2', 'day 3', 'practical study actions'],
  }),
  createCase({
    slug: 'source-grounded-index',
    title: 'Source Grounded - Index Trade-off',
    description: 'Answer only from the supplied snippet.',
    category: 'source_grounded_answer',
    difficulty: 'beginner',
    prompt:
      'Chỉ dựa vào đoạn sau để trả lời.\nĐoạn nguồn: "Indexes speed up data retrieval but add overhead to writes."\nCâu hỏi: Theo đoạn trên, trade-off chính của index là gì?',
    idealResponse:
      '- Theo đoạn đã cho, index giúp đọc dữ liệu nhanh hơn nhưng làm thao tác ghi tốn thêm chi phí.\n- Mình chỉ dùng thông tin nằm trong đoạn nguồn.',
    targetOutputShape: '2 bullets',
    maxResponseChars: 220,
    expectedKeyPoints: ['retrieval faster', 'writes slower/more overhead', 'no extra claims'],
  }),
  createCase({
    slug: 'source-grounded-http',
    title: 'Source Grounded - HTTP Cache',
    description: 'Grounded response from a short provided source.',
    category: 'source_grounded_answer',
    difficulty: 'beginner',
    prompt:
      'Chỉ dựa vào đoạn sau để trả lời.\nĐoạn nguồn: "Caching reduces repeated work but can serve stale data if invalidation is poor."\nCâu hỏi: Lợi ích và rủi ro chính của cache là gì?',
    idealResponse:
      '- Theo đoạn đã cho, cache giảm công việc lặp lại nên có lợi cho hiệu năng.\n- Rủi ro là có thể trả dữ liệu cũ nếu invalidation làm không tốt.',
    targetOutputShape: '2 bullets',
    maxResponseChars: 220,
    expectedKeyPoints: ['benefit', 'risk', 'grounded wording'],
  }),
  createCase({
    slug: 'source-grounded-oop',
    title: 'Source Grounded - Interface Snippet',
    description: 'Grounded OOP answer only from the snippet.',
    category: 'source_grounded_answer',
    difficulty: 'beginner',
    prompt:
      'Chỉ dựa vào đoạn sau để trả lời.\nĐoạn nguồn: "An interface defines what a class can do, not how it does it."\nCâu hỏi: Theo đoạn trên, interface nhấn mạnh điều gì?',
    idealResponse:
      '- Theo đoạn đã cho, interface nhấn mạnh hành vi mà class phải cung cấp.\n- Đoạn này không nói chi tiết cách cài đặt bên trong.',
    targetOutputShape: '2 bullets',
    maxResponseChars: 200,
    expectedKeyPoints: ['behavior/what', 'not implementation/how', 'grounded wording'],
  }),
  createCase({
    slug: 'fallback-no-code',
    title: 'Fallback Transparency - Missing Code',
    description: 'Refuse to guess without the artifact and ask for the next step.',
    category: 'fallback_transparency',
    difficulty: 'beginner',
    prompt: 'Mình chưa gửi code class Java nhưng bạn hãy kết luận ngay lỗi đóng gói nằm ở đâu.',
    idealResponse:
      '- Mình chưa thể kết luận chính xác vì bạn chưa gửi code.\n- Bạn hãy gửi class hoặc phần thuộc tính/phương thức liên quan.\n- Khi có code, mình sẽ chỉ rõ điểm vi phạm đóng gói.\n- Tự luyện: Em đoán trước thuộc tính nào nên để private?',
    targetOutputShape: '3-4 bullets',
    maxResponseChars: 260,
    expectedKeyPoints: ['honest limitation', 'ask for missing artifact', 'next step'],
  }),
  createCase({
    slug: 'fallback-no-query-plan',
    title: 'Fallback Transparency - Missing Query Plan',
    description: 'Do not guess DB issue without the plan or SQL.',
    category: 'fallback_transparency',
    difficulty: 'intermediate',
    prompt: 'Mình chưa gửi SQL hay query plan nhưng bạn hãy chốt ngay index nào đang sai.',
    idealResponse:
      '- Mình chưa đủ dữ kiện để chốt index nào sai.\n- Bạn hãy gửi câu SQL, điều kiện lọc và query plan nếu có.\n- Khi có các phần đó, mình mới so được cột lọc và index hiện tại.',
    targetOutputShape: '3 bullets',
    maxResponseChars: 240,
    expectedKeyPoints: ['honest limitation', 'ask for SQL/query plan', 'next step'],
  }),
  createCase({
    slug: 'fallback-no-error-log',
    title: 'Fallback Transparency - Missing Error Log',
    description: 'Do not fabricate root cause without the log.',
    category: 'fallback_transparency',
    difficulty: 'beginner',
    prompt: 'Mình chưa gửi log lỗi nhưng bạn hãy kết luận ngay bug Node.js nằm ở dòng nào.',
    idealResponse:
      '- Mình chưa thể chỉ đúng dòng lỗi nếu chưa thấy log hoặc đoạn code liên quan.\n- Bạn hãy gửi stack trace hay file nghi ngờ.\n- Sau đó mình sẽ khoanh vùng nguyên nhân cụ thể hơn.',
    targetOutputShape: '3 bullets',
    maxResponseChars: 230,
    expectedKeyPoints: ['honest limitation', 'ask for log/code', 'next step'],
  }),
];

export async function seedPhase9QualityEvalCases(client = prisma) {
  const results = [];

  for (const evalCase of PHASE9_EVAL_CASES) {
    const existing = await client.evalCase.findFirst({
      where: { name: evalCase.name },
      orderBy: { updatedAt: 'desc' },
    });

    const saved = existing
      ? await client.evalCase.update({
          where: { id: existing.id },
          data: {
            description: evalCase.description,
            category: evalCase.category,
            inputMessages: JSON.parse(JSON.stringify(evalCase.inputMessages)),
            idealResponse: evalCase.idealResponse,
            scoringNotes: evalCase.scoringNotes,
          },
        })
      : await client.evalCase.create({
          data: {
            name: evalCase.name,
            description: evalCase.description,
            category: evalCase.category,
            inputMessages: JSON.parse(JSON.stringify(evalCase.inputMessages)),
            idealResponse: evalCase.idealResponse,
            scoringNotes: evalCase.scoringNotes,
          },
        });

    results.push({
      id: saved.id,
      name: saved.name,
      category: saved.category,
      action: existing ? 'updated' : 'created',
    });
  }

  console.log(JSON.stringify({ total: results.length, prefix: CASE_PREFIX, items: results }, null, 2));
  return results;
}

const runFromCli = async () => {
  try {
    await seedPhase9QualityEvalCases(prisma);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    await prisma.$disconnect();
    process.exit(1);
  }
};

const entryHref = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryHref && entryHref === import.meta.url) {
  await runFromCli();
}
