export type MockQuestion = {
    id: number;
    text: string;
    options: { id: string; text: string }[];
    correctOptionId?: string; // optional for now
  };
  
  export const mockQuestions: MockQuestion[] = [
    {
      id: 1,
      text: 'What is 2 + 2?',
      options: [
        { id: 'A', text: '3' },
        { id: 'B', text: '4' },
        { id: 'C', text: '5' },
        { id: 'D', text: '6' },
      ],
      correctOptionId: 'B',
    },
    {
      id: 2,
      text: 'Which one is a JavaScript framework?',
      options: [
        { id: 'A', text: 'React' },
        { id: 'B', text: 'PostgreSQL' },
        { id: 'C', text: 'Express' },
        { id: 'D', text: 'TypeScript' },
      ],
      correctOptionId: 'A',
    },
    {
      id: 3,
      text: 'HTTP status code for “Not Found” is:',
      options: [
        { id: 'A', text: '200' },
        { id: 'B', text: '301' },
        { id: 'C', text: '404' },
        { id: 'D', text: '500' },
      ],
      correctOptionId: 'C',
    },
    {
      id: 4,
      text: 'Which HTML tag is used for the largest heading?',
      options: [
        { id: 'A', text: '<h6>' },
        { id: 'B', text: '<h1>' },
        { id: 'C', text: '<p>' },
        { id: 'D', text: '<div>' },
      ],
      correctOptionId: 'B',
    },
    {
      id: 5,
      text: 'CSS stands for:',
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
      options: [
        { id: 'A', text: 'useFetch' },
        { id: 'B', text: 'useState' },
        { id: 'C', text: 'useRoute' },
        { id: 'D', text: 'useNode' },
      ],
      correctOptionId: 'B',
    },
    {
      id: 7,
      text: 'TypeScript is:',
      options: [
        { id: 'A', text: 'A database' },
        { id: 'B', text: 'A superset of JavaScript' },
        { id: 'C', text: 'A CSS framework' },
        { id: 'D', text: 'A backend server' },
      ],
      correctOptionId: 'B',
    },
    {
      id: 8,
      text: 'Which command starts a Vite dev server usually?',
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
      options: [
        { id: 'A', text: 'On the server' },
        { id: 'B', text: 'In the browser' },
        { id: 'C', text: 'Inside PostgreSQL' },
        { id: 'D', text: 'In Express middleware' },
      ],
      correctOptionId: 'B',
    },
  ];
  