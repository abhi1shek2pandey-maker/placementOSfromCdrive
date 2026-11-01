/**
 * Seed Script — Learning Roadmap
 *
 * Seeds all 7 learning tracks and their complete topic lists for a user.
 * Run after registration: npm run seed -- --userId=<id>
 * Or called automatically from registration flow.
 */

import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import { LearningTrack } from '../db/models/LearningTrack';
import { LearningTopic } from '../db/models/LearningTopic';
import { logger } from '../config/logger';

interface TopicDef {
  name: string;
  category: string;
  estimatedHours: number;
  resources: Array<{ title: string; url: string; type: string; estimatedMinutes: number }>;
  prerequisites?: string[];
}

interface TrackDef {
  name: string;
  priority: number;
  targetOutcome: string;
  topics: TopicDef[];
}

const ROADMAP: TrackDef[] = [
  {
    name: 'DSA & C++',
    priority: 1,
    targetOutcome: 'Solve LC Medium confidently, pass MAANG OAs, and demonstrate strong algorithmic thinking',
    topics: [
      { name: 'Complexity Analysis (Time & Space)', category: 'Fundamentals', estimatedHours: 3,
        resources: [{ title: 'Big-O Cheat Sheet', url: 'https://www.bigocheatsheet.com/', type: 'article', estimatedMinutes: 30 },
                    { title: 'CS Dojo — Time Complexity', url: 'https://www.youtube.com/watch?v=D6xkbGLQesk', type: 'video', estimatedMinutes: 20 }] },
      { name: 'Arrays & Strings', category: 'Linear DS', estimatedHours: 6,
        resources: [{ title: 'NeetCode — Arrays', url: 'https://neetcode.io/roadmap', type: 'problem_set', estimatedMinutes: 120 }] },
      { name: 'Hashing & Hash Maps', category: 'Linear DS', estimatedHours: 4,
        resources: [{ title: 'LeetCode Hash Table Tag', url: 'https://leetcode.com/tag/hash-table/', type: 'problem_set', estimatedMinutes: 90 }] },
      { name: 'Two Pointers', category: 'Technique', estimatedHours: 3,
        resources: [{ title: 'LeetCode Two Pointers', url: 'https://leetcode.com/tag/two-pointers/', type: 'problem_set', estimatedMinutes: 60 }] },
      { name: 'Sliding Window', category: 'Technique', estimatedHours: 3,
        resources: [{ title: 'Sliding Window Patterns', url: 'https://leetcode.com/discuss/study-guide/1773891/Sliding-Window-Technique-and-Question-Bank', type: 'article', estimatedMinutes: 45 }] },
      { name: 'Binary Search', category: 'Search', estimatedHours: 5,
        resources: [{ title: 'Binary Search — LeetCode Explore', url: 'https://leetcode.com/explore/learn/card/binary-search/', type: 'article', estimatedMinutes: 90 }] },
      { name: 'Sorting Algorithms', category: 'Sorting', estimatedHours: 4,
        resources: [{ title: 'Visualgo — Sorting', url: 'https://visualgo.net/en/sorting', type: 'video', estimatedMinutes: 60 }] },
      { name: 'Linked Lists', category: 'Linear DS', estimatedHours: 5,
        resources: [{ title: 'NeetCode — Linked List', url: 'https://neetcode.io/roadmap', type: 'problem_set', estimatedMinutes: 90 }] },
      { name: 'Stacks & Queues', category: 'Linear DS', estimatedHours: 4,
        resources: [{ title: 'LeetCode Stack Tag', url: 'https://leetcode.com/tag/stack/', type: 'problem_set', estimatedMinutes: 60 }] },
      { name: 'Recursion & Backtracking', category: 'Technique', estimatedHours: 6,
        resources: [{ title: 'Striver Recursion Series', url: 'https://www.youtube.com/watch?v=yVdKa8dnKiE&list=PLgUwDviBIf0rGlzIn_7rsaR2FQ5e6ZOL9', type: 'video', estimatedMinutes: 180 }] },
      { name: 'Trees & BST', category: 'Non-Linear DS', estimatedHours: 8,
        resources: [{ title: 'NeetCode — Trees', url: 'https://neetcode.io/roadmap', type: 'problem_set', estimatedMinutes: 180 }] },
      { name: 'Heaps & Priority Queue', category: 'Non-Linear DS', estimatedHours: 4,
        resources: [{ title: 'LeetCode Heap Tag', url: 'https://leetcode.com/tag/heap-priority-queue/', type: 'problem_set', estimatedMinutes: 60 }] },
      { name: 'Greedy Algorithms', category: 'Technique', estimatedHours: 4,
        resources: [{ title: 'Greedy — CP Algorithms', url: 'https://cp-algorithms.com/', type: 'article', estimatedMinutes: 90 }] },
      { name: 'Graphs — BFS & DFS', category: 'Graph', estimatedHours: 6,
        resources: [{ title: 'Striver Graph Series', url: 'https://www.youtube.com/playlist?list=PLgUwDviBIf0oE3gA41TKO2H5bHpPd7fzn', type: 'video', estimatedMinutes: 240 }] },
      { name: 'Graphs — Topological Sort', category: 'Graph', estimatedHours: 3,
        resources: [{ title: 'CP Algorithms — Topological Sort', url: 'https://cp-algorithms.com/graph/topological-sort.html', type: 'article', estimatedMinutes: 60 }] },
      { name: 'Shortest Paths (Dijkstra, Bellman-Ford)', category: 'Graph', estimatedHours: 5,
        resources: [{ title: 'Visualgo — Graph', url: 'https://visualgo.net/en/sssp', type: 'video', estimatedMinutes: 90 }] },
      { name: 'Disjoint Set Union (DSU)', category: 'Graph', estimatedHours: 3,
        resources: [{ title: 'CP Algorithms — DSU', url: 'https://cp-algorithms.com/data_structures/disjoint_set_union.html', type: 'article', estimatedMinutes: 45 }] },
      { name: 'Dynamic Programming — 1D', category: 'DP', estimatedHours: 8,
        resources: [{ title: 'Striver DP Series', url: 'https://www.youtube.com/playlist?list=PLgUwDviBIf0qUlt5H_kiKYaNSqJ81PMMY', type: 'video', estimatedMinutes: 300 }] },
      { name: 'Dynamic Programming — 2D & DP on Grids', category: 'DP', estimatedHours: 6,
        resources: [{ title: 'LeetCode DP Tag', url: 'https://leetcode.com/tag/dynamic-programming/', type: 'problem_set', estimatedMinutes: 180 }] },
      { name: 'Advanced DP (Interval, Tree, Digit)', category: 'DP', estimatedHours: 6,
        resources: [{ title: 'CP Algorithms — DP', url: 'https://cp-algorithms.com/dynamic_programming/', type: 'article', estimatedMinutes: 120 }] },
      { name: 'Tries', category: 'Non-Linear DS', estimatedHours: 3,
        resources: [{ title: 'LeetCode Trie Explore', url: 'https://leetcode.com/explore/learn/card/trie/', type: 'article', estimatedMinutes: 60 }] },
      { name: 'Bit Manipulation', category: 'Technique', estimatedHours: 3,
        resources: [{ title: 'Bit Manipulation Tricks', url: 'https://leetcode.com/discuss/study-guide/4282051/Bit-Manipulation-Algorithms', type: 'article', estimatedMinutes: 60 }] },
      { name: 'Segment Trees & Fenwick Trees', category: 'Advanced DS', estimatedHours: 5,
        resources: [{ title: 'CP Algorithms — Segment Tree', url: 'https://cp-algorithms.com/data_structures/segment_tree.html', type: 'article', estimatedMinutes: 90 }] },
      { name: 'String Algorithms (KMP, Z, Manacher)', category: 'String', estimatedHours: 5,
        resources: [{ title: 'CP Algorithms — Strings', url: 'https://cp-algorithms.com/string/', type: 'article', estimatedMinutes: 120 }] },
      { name: 'C++ STL Deep Dive', category: 'C++', estimatedHours: 4,
        resources: [{ title: 'CppReference STL', url: 'https://en.cppreference.com/w/cpp/container', type: 'documentation', estimatedMinutes: 90 }] },
      { name: 'C++ OOP & Modern C++', category: 'C++', estimatedHours: 5,
        resources: [{ title: 'LearnCpp.com', url: 'https://www.learncpp.com/', type: 'article', estimatedMinutes: 120 }] },
    ],
  },
  {
    name: 'Core CS',
    priority: 2,
    targetOutcome: 'Confidently answer DBMS, OS, CN, and OOP interview questions at MAANG level',
    topics: [
      { name: 'OOP Fundamentals (Classes, Objects, Encapsulation)', category: 'OOP', estimatedHours: 3,
        resources: [{ title: 'OOP in C++ — GeeksForGeeks', url: 'https://www.geeksforgeeks.org/object-oriented-programming-in-cpp/', type: 'article', estimatedMinutes: 60 }] },
      { name: 'OOP — Inheritance, Polymorphism, Abstraction', category: 'OOP', estimatedHours: 4,
        resources: [{ title: 'OOP Concepts — GFG', url: 'https://www.geeksforgeeks.org/oops-concepts/', type: 'article', estimatedMinutes: 90 }] },
      { name: 'DBMS — ER Model, Normalization', category: 'DBMS', estimatedHours: 4,
        resources: [{ title: 'DBMS Course — Gate Smashers', url: 'https://www.youtube.com/playlist?list=PLxCzCOWd7aiFAN6I8CuViBuCdJgiOkT2Y', type: 'video', estimatedMinutes: 180 }] },
      { name: 'DBMS — SQL (Joins, Aggregates, Subqueries)', category: 'DBMS', estimatedHours: 5,
        resources: [{ title: 'SQLZoo', url: 'https://sqlzoo.net/wiki/SQL_Tutorial', type: 'problem_set', estimatedMinutes: 180 },
                    { title: 'LeetCode SQL 50', url: 'https://leetcode.com/studyplan/top-sql-50/', type: 'problem_set', estimatedMinutes: 120 }] },
      { name: 'DBMS — Transactions, ACID, Isolation Levels', category: 'DBMS', estimatedHours: 3,
        resources: [{ title: 'Transactions — CMU DB', url: 'https://15445.courses.cs.cmu.edu/fall2023/', type: 'article', estimatedMinutes: 90 }] },
      { name: 'DBMS — Indexing, B-Trees', category: 'DBMS', estimatedHours: 3,
        resources: [{ title: 'Indexing — Use The Index Luke', url: 'https://use-the-index-luke.com/', type: 'article', estimatedMinutes: 60 }] },
      { name: 'OS — Processes & Threads', category: 'OS', estimatedHours: 4,
        resources: [{ title: 'OS GATE Lectures — Neso Academy', url: 'https://www.youtube.com/playlist?list=PLBlnK6fEyqRiVhbXDGLXDk_OQAeuVcp2O', type: 'video', estimatedMinutes: 120 }] },
      { name: 'OS — Scheduling Algorithms', category: 'OS', estimatedHours: 3,
        resources: [{ title: 'CPU Scheduling — GFG', url: 'https://www.geeksforgeeks.org/cpu-scheduling-in-operating-systems/', type: 'article', estimatedMinutes: 60 }] },
      { name: 'OS — Memory Management (Paging, Segmentation)', category: 'OS', estimatedHours: 4,
        resources: [{ title: 'Memory Management — Neso Academy', url: 'https://www.youtube.com/playlist?list=PLBlnK6fEyqRiVhbXDGLXDk_OQAeuVcp2O', type: 'video', estimatedMinutes: 90 }] },
      { name: 'OS — Synchronization (Mutex, Semaphore, Deadlock)', category: 'OS', estimatedHours: 4,
        resources: [{ title: 'Deadlock & Sync — GFG', url: 'https://www.geeksforgeeks.org/introduction-of-deadlock-in-operating-system/', type: 'article', estimatedMinutes: 90 }] },
      { name: 'OS — File Systems & I/O', category: 'OS', estimatedHours: 3,
        resources: [{ title: 'File Systems — OS Three Easy Pieces', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/', type: 'article', estimatedMinutes: 90 }] },
      { name: 'Computer Networks — OSI & TCP/IP', category: 'CN', estimatedHours: 3,
        resources: [{ title: 'CN — Gate Smashers', url: 'https://www.youtube.com/playlist?list=PLxCzCOWd7aiGFBD2-2joCpWOLUrDLvVV_', type: 'video', estimatedMinutes: 90 }] },
      { name: 'Computer Networks — HTTP, HTTPS, WebSockets', category: 'CN', estimatedHours: 3,
        resources: [{ title: 'HTTP Fundamentals — MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP', type: 'documentation', estimatedMinutes: 60 }] },
      { name: 'Computer Networks — DNS, TCP vs UDP', category: 'CN', estimatedHours: 2,
        resources: [{ title: 'How DNS Works', url: 'https://howdns.works/', type: 'article', estimatedMinutes: 30 }] },
    ],
  },
  {
    name: 'Backend Engineering',
    priority: 3,
    targetOutcome: 'Build and explain production-quality Node.js APIs with reliability, security, and observability',
    topics: [
      { name: 'REST API Design & Validation', category: 'API', estimatedHours: 3,
        resources: [{ title: 'REST API Design Best Practices', url: 'https://www.freecodecamp.org/news/rest-api-design-best-practices-build-a-rest-api/', type: 'article', estimatedMinutes: 60 }] },
      { name: 'Authentication — JWT & Sessions', category: 'Auth', estimatedHours: 3,
        resources: [{ title: 'JWT.io Introduction', url: 'https://jwt.io/introduction', type: 'documentation', estimatedMinutes: 45 }] },
      { name: 'Authorization — RBAC & Middleware', category: 'Auth', estimatedHours: 2,
        resources: [{ title: 'RBAC Patterns — Node.js', url: 'https://www.digitalocean.com/community/tutorials/role-and-privilege-based-authorization', type: 'article', estimatedMinutes: 45 }] },
      { name: 'Database Design & Indexing', category: 'Database', estimatedHours: 4,
        resources: [{ title: 'MongoDB Indexing Guide', url: 'https://www.mongodb.com/docs/manual/indexes/', type: 'documentation', estimatedMinutes: 90 }] },
      { name: 'Transactions & Idempotency', category: 'Reliability', estimatedHours: 4,
        resources: [{ title: 'Idempotency in APIs', url: 'https://stripe.com/docs/idempotency', type: 'article', estimatedMinutes: 45 }] },
      { name: 'Message Queues & Workers', category: 'Async', estimatedHours: 5,
        resources: [{ title: 'BullMQ Docs', url: 'https://docs.bullmq.io/', type: 'documentation', estimatedMinutes: 120 }] },
      { name: 'Caching (Redis)', category: 'Performance', estimatedHours: 4,
        resources: [{ title: 'Redis University — Free', url: 'https://university.redis.com/', type: 'video', estimatedMinutes: 120 }] },
      { name: 'Rate Limiting & Throttling', category: 'Performance', estimatedHours: 2,
        resources: [{ title: 'Rate Limiting Patterns', url: 'https://www.figma.com/blog/an-alternative-approach-to-rate-limiting/', type: 'article', estimatedMinutes: 45 }] },
      { name: 'Error Handling & Observability', category: 'Reliability', estimatedHours: 3,
        resources: [{ title: 'Node.js Error Handling — Smashing Magazine', url: 'https://www.smashingmagazine.com/2020/08/error-handling-nodejs-error-classes/', type: 'article', estimatedMinutes: 60 }] },
      { name: 'Testing — Unit & Integration', category: 'Testing', estimatedHours: 4,
        resources: [{ title: 'Vitest Docs', url: 'https://vitest.dev/', type: 'documentation', estimatedMinutes: 90 }] },
      { name: 'API Security (OWASP)', category: 'Security', estimatedHours: 3,
        resources: [{ title: 'OWASP API Security Top 10', url: 'https://owasp.org/www-project-api-security/', type: 'documentation', estimatedMinutes: 90 }] },
      { name: 'WebSockets & Real-Time Patterns', category: 'Real-Time', estimatedHours: 3,
        resources: [{ title: 'Socket.io Docs', url: 'https://socket.io/docs/v4/', type: 'documentation', estimatedMinutes: 90 }] },
    ],
  },
  {
    name: 'System Design',
    priority: 4,
    targetOutcome: 'Design scalable systems confidently in SDE2-level interviews',
    topics: [
      { name: 'Client-Server & API Design', category: 'Fundamentals', estimatedHours: 3,
        resources: [{ title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', type: 'documentation', estimatedMinutes: 120 }] },
      { name: 'Data Modelling', category: 'Database', estimatedHours: 3,
        resources: [{ title: 'Designing Data-Intensive Apps (free chapters)', url: 'https://github.com/donnemartin/system-design-primer#designing-a-system-that-scales', type: 'article', estimatedMinutes: 90 }] },
      { name: 'Caching Strategies (CDN, Redis)', category: 'Performance', estimatedHours: 3,
        resources: [{ title: 'Caching — System Design Primer', url: 'https://github.com/donnemartin/system-design-primer#cache', type: 'article', estimatedMinutes: 60 }] },
      { name: 'Message Queues & Event-Driven Systems', category: 'Async', estimatedHours: 3,
        resources: [{ title: 'Message Queue Patterns', url: 'https://github.com/donnemartin/system-design-primer#asynchronism', type: 'article', estimatedMinutes: 60 }] },
      { name: 'Reliability — Timeouts, Retries, Circuit Breakers', category: 'Reliability', estimatedHours: 3,
        resources: [{ title: 'Release It! Patterns (summary)', url: 'https://martinfowler.com/bliki/CircuitBreaker.html', type: 'article', estimatedMinutes: 45 }] },
      { name: 'Scalability — Horizontal Scaling, Load Balancing', category: 'Scalability', estimatedHours: 3,
        resources: [{ title: 'Scalability — High Scalability Blog', url: 'http://highscalability.com/', type: 'article', estimatedMinutes: 60 }] },
      { name: 'Logging, Metrics & Tracing', category: 'Observability', estimatedHours: 2,
        resources: [{ title: 'Three Pillars of Observability', url: 'https://www.honeycomb.io/resources/the-three-pillars-of-observability', type: 'article', estimatedMinutes: 45 }] },
      { name: 'LLD — SOLID & Design Patterns', category: 'LLD', estimatedHours: 5,
        resources: [{ title: 'Refactoring Guru — Design Patterns', url: 'https://refactoring.guru/design-patterns', type: 'article', estimatedMinutes: 180 }] },
      { name: 'Design: URL Shortener', category: 'Case Study', estimatedHours: 2,
        resources: [{ title: 'URL Shortener — System Design Primer', url: 'https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/pastebin/README.md', type: 'article', estimatedMinutes: 60 }] },
      { name: 'Design: Real-Time Chat (your project)', category: 'Case Study', estimatedHours: 2,
        resources: [{ title: 'System Design — Chat App', url: 'https://github.com/donnemartin/system-design-primer#design-a-chat-service', type: 'article', estimatedMinutes: 60 }] },
      { name: 'Design: Notification Service', category: 'Case Study', estimatedHours: 2,
        resources: [{ title: 'Notification System Design', url: 'https://www.youtube.com/watch?v=bBTPZ9NdSk8', type: 'video', estimatedMinutes: 45 }] },
    ],
  },
  {
    name: 'GenAI & AI Agents',
    priority: 5,
    targetOutcome: 'Build, evaluate, and deploy production AI agent workflows using LangGraph and MCP',
    topics: [
      { name: 'LLM APIs & Structured Outputs', category: 'Fundamentals', estimatedHours: 3,
        resources: [{ title: 'Google AI Studio', url: 'https://aistudio.google.com/', type: 'documentation', estimatedMinutes: 60 }] },
      { name: 'Tool Calling & Function Calling', category: 'Agent Patterns', estimatedHours: 3,
        resources: [{ title: 'Gemini Tool Calling Docs', url: 'https://ai.google.dev/gemini-api/docs/function-calling', type: 'documentation', estimatedMinutes: 90 }] },
      { name: 'Agent Workflows & State Management', category: 'Agent Patterns', estimatedHours: 4,
        resources: [{ title: 'LangGraph Docs', url: 'https://langchain-ai.github.io/langgraph/', type: 'documentation', estimatedMinutes: 120 }] },
      { name: 'MCP Architecture & Security', category: 'MCP', estimatedHours: 3,
        resources: [{ title: 'MCP Specification', url: 'https://modelcontextprotocol.io/', type: 'documentation', estimatedMinutes: 90 }] },
      { name: 'Embeddings & Vector Search', category: 'RAG', estimatedHours: 3,
        resources: [{ title: 'Embedding Guide — Cohere', url: 'https://cohere.com/blog/text-embeddings', type: 'article', estimatedMinutes: 60 }] },
      { name: 'RAG — Retrieval Augmented Generation', category: 'RAG', estimatedHours: 4,
        resources: [{ title: 'RAG from Scratch — LangChain', url: 'https://www.youtube.com/playlist?list=PLfaIDFEXuae2LXbO1_PKyVJiQ23ZztA0x', type: 'video', estimatedMinutes: 120 }] },
      { name: 'Agent Evaluation & Observability', category: 'Production', estimatedHours: 3,
        resources: [{ title: 'LangSmith Docs', url: 'https://docs.smith.langchain.com/', type: 'documentation', estimatedMinutes: 60 }] },
      { name: 'Guardrails & Failure Handling', category: 'Production', estimatedHours: 3,
        resources: [{ title: 'Guardrails for LLMs', url: 'https://github.com/NVIDIA/NeMo-Guardrails', type: 'documentation', estimatedMinutes: 60 }] },
    ],
  },
  {
    name: 'DevOps & Deployment',
    priority: 6,
    targetOutcome: 'Deploy, monitor, and maintain production applications on cloud infrastructure',
    topics: [
      { name: 'Linux & Shell Scripting Basics', category: 'Linux', estimatedHours: 4,
        resources: [{ title: 'Linux Command Line — Free Book', url: 'https://linuxcommand.org/tlcl.php', type: 'documentation', estimatedMinutes: 120 }] },
      { name: 'Git & GitHub — Advanced', category: 'Git', estimatedHours: 3,
        resources: [{ title: 'Pro Git — Free', url: 'https://git-scm.com/book/en/v2', type: 'documentation', estimatedMinutes: 90 }] },
      { name: 'Docker & Docker Compose', category: 'Containers', estimatedHours: 5,
        resources: [{ title: 'Docker Getting Started', url: 'https://docs.docker.com/get-started/', type: 'documentation', estimatedMinutes: 120 }] },
      { name: 'Environment Variables & Secret Management', category: 'Configuration', estimatedHours: 2,
        resources: [{ title: '12-Factor App', url: 'https://12factor.net/', type: 'article', estimatedMinutes: 45 }] },
      { name: 'CI/CD — GitHub Actions', category: 'CI/CD', estimatedHours: 4,
        resources: [{ title: 'GitHub Actions Docs', url: 'https://docs.github.com/en/actions', type: 'documentation', estimatedMinutes: 120 }] },
      { name: 'Cloud Deployment (Render / Railway / Fly.io)', category: 'Deployment', estimatedHours: 3,
        resources: [{ title: 'Render Deploy Guide', url: 'https://render.com/docs', type: 'documentation', estimatedMinutes: 60 }] },
      { name: 'Logging & Monitoring Basics', category: 'Observability', estimatedHours: 3,
        resources: [{ title: 'Logging Best Practices', url: 'https://www.loggly.com/ultimate-guide/node-logging-basics/', type: 'article', estimatedMinutes: 60 }] },
    ],
  },
  {
    name: 'Placement Preparation',
    priority: 7,
    targetOutcome: 'Pass coding assessments, ace technical + HR interviews, and secure strong offers',
    topics: [
      { name: 'Resume & Project Explanation', category: 'Resume', estimatedHours: 3,
        resources: [{ title: 'Resume Tips — Levels.fyi', url: 'https://www.levels.fyi/blog/applying-to-companies.html', type: 'article', estimatedMinutes: 60 }] },
      { name: 'Behavioral Interview (STAR Method)', category: 'Behavioral', estimatedHours: 3,
        resources: [{ title: 'STAR Method Guide', url: 'https://www.themuse.com/advice/star-interview-method', type: 'article', estimatedMinutes: 45 }] },
      { name: 'Timed Coding Assessments Practice', category: 'OA', estimatedHours: 6,
        resources: [{ title: 'LeetCode Contests', url: 'https://leetcode.com/contest/', type: 'problem_set', estimatedMinutes: 120 }] },
      { name: 'Mock Interviews', category: 'Interview', estimatedHours: 6,
        resources: [{ title: 'Pramp — Free Mock Interviews', url: 'https://www.pramp.com/', type: 'problem_set', estimatedMinutes: 60 },
                    { title: 'InterviewBit', url: 'https://www.interviewbit.com/', type: 'problem_set', estimatedMinutes: 60 }] },
      { name: 'SQL Practice (Interview-Level)', category: 'SQL', estimatedHours: 3,
        resources: [{ title: 'LeetCode SQL 50', url: 'https://leetcode.com/studyplan/top-sql-50/', type: 'problem_set', estimatedMinutes: 120 }] },
      { name: 'Company-Specific OA Practice', category: 'OA', estimatedHours: 5,
        resources: [{ title: 'LeetCode Company Tags', url: 'https://leetcode.com/problemset/', type: 'problem_set', estimatedMinutes: 120 }] },
      { name: 'Internship & Job Applications Tracker', category: 'Applications', estimatedHours: 2,
        resources: [{ title: 'Internshala', url: 'https://internshala.com/', type: 'article', estimatedMinutes: 30 },
                    { title: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs/', type: 'article', estimatedMinutes: 30 }] },
    ],
  },
];

export async function seedRoadmap(userId: string): Promise<void> {
  const userObjId = new mongoose.Types.ObjectId(userId);

  // Remove existing tracks and topics for this user (idempotent re-seed)
  await LearningTrack.deleteMany({ userId: userObjId });
  await LearningTopic.deleteMany({ userId: userObjId });

  for (const trackDef of ROADMAP) {
    const track = await LearningTrack.create({
      userId: userObjId,
      name: trackDef.name,
      priority: trackDef.priority,
      targetOutcome: trackDef.targetOutcome,
    });

    const topicDocs = trackDef.topics.map((t, i) => ({
      userId: userObjId,
      trackId: track._id,
      name: t.name,
      category: t.category,
      estimatedHours: t.estimatedHours,
      resources: t.resources,
      orderIndex: i,
    }));

    await LearningTopic.insertMany(topicDocs);
    logger.info(`Seeded track: ${trackDef.name} (${topicDocs.length} topics)`);
  }

  logger.info('Roadmap seeding complete', { userId });
}

// CLI entry point
if (require.main === module) {
  const userId = process.argv.find((a) => a.startsWith('--userId='))?.split('=')[1];
  if (!userId) {
    console.error('Usage: tsx src/scripts/seed.ts --userId=<userId>');
    process.exit(1);
  }

  connectDB()
    .then(() => seedRoadmap(userId))
    .then(() => {
      logger.info('Seed complete');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seed failed', { error: err.message });
      process.exit(1);
    });
}
