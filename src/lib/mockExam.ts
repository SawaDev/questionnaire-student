export type QuestionType = 'single' | 'multi';

export type MockQuestion = {
  id: number;
  text: string;
  type?: QuestionType; // default "single"
  options: { id: string; text: string }[];

  // ✅ single correct
  correctOptionId?: string;

  // ✅ multi correct
  correctOptionIds?: string[];

  // ✅ optional question images
  images?: string[];
};

export const mockQuestions: MockQuestion[] = [
  {
    id: 1,
    text: 'What is 2 + 2?',
    type: 'single',
    options: [
      { id: 'A', text: '3' },
      { id: 'B', text: '4' },
      { id: 'C', text: '5' },
      { id: 'D', text: '6' },
    ],
    correctOptionId: 'B',
  },

  // ✅ example multi-select
  {
    id: 2,
    text: 'Select ALL JavaScript frameworks/libraries:',
    type: 'multi',
    options: [
      { id: 'A', text: 'React' },
      { id: 'B', text: 'PostgreSQL' },
      { id: 'C', text: 'Vue' },
      { id: 'D', text: 'Angular' },
    ],
    correctOptionIds: ['A', 'C', 'D'], // ✅ all must be selected, no extras
  },

  {
    id: 3,
    text: 'HTTP status code for “Not Found” is:',
    type: 'single',
    options: [
      { id: 'A', text: '200' },
      { id: 'B', text: '301' },
      { id: 'C', text: '404' },
      { id: 'D', text: '500' },
    ],
    correctOptionId: 'C',
  },

  // ✅ example with image
  {
    id: 4,
    text: 'Look at the picture and choose the correct answer:',
    type: 'single',
    images: ['/images/q4.png'], // put file in public/images/q4.png
    options: [
      { id: 'A', text: '1.27' },
      { id: 'B', text: '2' },
      { id: 'C', text: '3' },
      { id: 'D', text: '4' },
    ],
    correctOptionId: 'B',
  },

  {
    id: 5,
    text: 'CSS stands for:',
    type: 'single',
    options: [
      { id: 'A', text: 'Computer Style Sheets' },
      { id: 'B', text: 'Cascading Style Sheets' },
      { id: 'C', text: 'Creative Style System' },
      { id: 'D', text: 'Colorful Style Sheets' },
    ],
    correctOptionId: 'B',
  },

  {
    id: 6,
    text: 'Which hook is used for state in React?',
    type: 'single',
    options: [
      { id: 'A', text: 'useFetch' },
      { id: 'B', text: 'useState' },
      { id: 'C', text: 'useRoute' },
      { id: 'D', text: 'useNode' },
    ],
    correctOptionId: 'B',
  },

  // ✅ multi-select example (math)
  {
    id: 7,
    text: 'Select ALL prime numbers:',
    type: 'multi',
    options: [
      { id: 'A', text: '2' },
      { id: 'B', text: '3' },
      { id: 'C', text: '4' },
      { id: 'D', text: '5' },
    ],
    correctOptionIds: ['A', 'B', 'D'],
  },

  {
    id: 8,
    text: 'Which command starts a Vite dev server usually?',
    type: 'single',
    options: [
      { id: 'A', text: 'npm run dev' },
      { id: 'B', text: 'npm run build' },
      { id: 'C', text: 'npm run seed' },
      { id: 'D', text: 'npm run migrate' },
    ],
    correctOptionId: 'A',
  },

  {
    id: 9,
    text: 'LocalStorage data is stored:',
    type: 'single',
    options: [
      { id: 'A', text: 'On the server' },
      { id: 'B', text: 'In the browser' },
      { id: 'C', text: 'Inside PostgreSQL' },
      { id: 'D', text: 'In Express middleware' },
    ],
    correctOptionId: 'B',
  },
];
