export const MOCK_TRANSCRIPT = [
    { role: "assistant", content: "Hello! When you are ready, please start the assessment." },
];

export const MOCK_CODE_SQL = `-- Optimizing a slow query
SELECT * 
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.created_at > '2023-01-01';`;

export const MOCK_CODE_PYTHON = `# Using list comprehension
numbers = [1, 2, 3, 4, 5]
squared = [x**2 for x in numbers]
print(squared)`;
