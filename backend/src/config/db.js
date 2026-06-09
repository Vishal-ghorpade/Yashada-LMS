import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Rubric from '../models/Rubric.js';
import Quiz from '../models/Quiz.js';
import Video from '../models/Video.js';
import Course from '../models/Course.js';
import ActivityLog from '../models/ActivityLog.js';
import Department from '../models/Department.js';
import Enrollment from '../models/Enrollment.js';
import CalendarEvent from '../models/CalendarEvent.js';

let mongod = null;

const autoSeedDB = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already has data. Skipping auto-seeding.');
      return;
    }

    console.log('Database is empty. Running auto-seeding with mock data...');

    // 0. Seed Standard Departments
    const depts = [
      { _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61911'), name: 'Finance', description: 'Financial management, audits, budgeting, and planning.' },
      { _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61912'), name: 'Administration', description: 'General administration, personnel, coordination, and services.' },
      { _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61913'), name: 'Revenue', description: 'Revenue collection, land records, taxation, and registers.' },
      { _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61914'), name: 'Planning', description: 'State planning, policy drafts, scheme evaluation, and targets.' },
      { _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61915'), name: 'Education', description: 'School administration, training modules, curriculum research.' },
      { _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61916'), name: 'Health', description: 'Public health management, medical supplies, primary care setups.' }
    ];
    
    const seededDepts = {};
    for (const d of depts) {
      let deptDoc = await Department.create(d);
      seededDepts[d.name] = deptDoc._id;
      console.log(`Seeded Department: ${d.name}`);
    }

    // 1. Create Default Admin
    const admin = await User.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61901'),
      name: 'YASHADA Administrator',
      email: 'admin@yashada.org',
      password: 'adminpassword123', // Hashed by User schema save hook
      role: 'admin',
      department: seededDepts['Administration'],
      designation: 'DG Assistant',
      yearsOfExperience: 15,
      profileCollected: true,
      rollNumber: 'YSH-ADMIN'
    });
    console.log('Created Admin User: admin@yashada.org / adminpassword123');

    // Create seeding activity log
    await ActivityLog.create({
      user: admin._id,
      action: 'Auto database seeding executed',
      ip: '127.0.0.1'
    });

    // 2. Create Sample Rubric
    const rubric = await Rubric.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61921'),
      title: 'Digital Assets Quality & AI Evaluation Rubric',
      description: 'Rubric for assessing digital content created with generative AI tools. Use this matrix to evaluate relevance, visual quality, and tool proficiency.',
      scaleMin: 1,
      scaleMax: 4,
      createdBy: admin._id,
      parameters: [
        {
          name: 'Relevance & Purpose Fit',
          description: 'Evaluates if the digital asset matches the core learning objectives and intended use cases.',
          levels: [
            {
              level: 1,
              label: 'Beginning',
              description: 'The asset has little or no connection to the learning goal or context. The AI prompt was generic and the output was used without any customisation.'
            },
            {
              level: 2,
              label: 'Developing',
              description: 'The asset is loosely related to the topic. Some attempt was made to customise the AI output, but the connection to the intended purpose is unclear.'
            },
            {
              level: 3,
              label: 'Proficient',
              description: 'The asset clearly addresses the learning goal. The AI was prompted with relevant context and the output was adapted to suit the specific use case.'
            },
            {
              level: 4,
              label: 'Exemplary',
              description: 'The asset is precisely targeted to the learning objective with a well-crafted prompt and thoughtful editing. It would be immediately usable in a real training or work setting.'
            }
          ]
        },
        {
          name: 'Quality & Presentation',
          description: 'Evaluates the spelling, structure, visual layout, and formatting coherence of the asset.',
          levels: [
            {
              level: 1,
              label: 'Beginning',
              description: 'The asset has significant errors, inconsistencies, or is poorly formatted. It would require major rework before it could be shared.'
            },
            {
              level: 2,
              label: 'Developing',
              description: 'The asset is understandable but has noticeable gaps in structure, clarity, or visual appeal. Some editing was done but it feels incomplete.'
            },
            {
              level: 3,
              label: 'Proficient',
              description: 'The asset is well-structured, clearly presented, and free of major errors. Minor refinements may be needed but it is largely ready to use.'
            },
            {
              level: 4,
              label: 'Exemplary',
              description: 'The asset is polished, professional, and visually coherent. Language, layout, and content work together to make it stand out as high quality.'
            }
          ]
        },
        {
          name: 'AI Tool Proficiency',
          description: 'Assess the depth of prompting and human-in-the-loop validation applied to guide the generative tools.',
          levels: [
            {
              level: 1,
              label: 'Beginning',
              description: 'The AI tool was used minimally – a single basic prompt with no iteration. The first output was accepted with little or no review.'
            },
            {
              level: 2,
              label: 'Developing',
              description: 'The tool was used with some prompting, but the approach was largely trial-and-error. There is limited evidence of deliberate prompt design.'
            },
            {
              level: 3,
              label: 'Proficient',
              description: 'The tool was used purposefully – prompts were specific, outputs were reviewed and refined, and the participant shows growing confidence with the tool.'
            },
            {
              level: 4,
              label: 'Exemplary',
              description: 'The tool was used with skill and intention – prompts were layered, outputs were critically evaluated, and the final asset shows clear evidence of human judgement combined with AI assistance.'
            }
          ]
        }
      ]
    });
    console.log(`Created Sample Rubric: "${rubric.title}"`);

    // 3. Create Sample Quiz
    const quiz = await Quiz.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61922'),
      title: 'Generative AI & Prompt Engineering Assessment',
      description: 'Test your understanding of prompt styles, LLM settings, and safety principles for civil service integration.',
      category: 'Artificial Intelligence',
      timer: 5, // 5 minutes
      positiveMarks: 2,
      negativeMarks: 0.5,
      shuffleQuestions: false,
      createdBy: admin._id,
      questions: [
        {
          text: 'What does the LLM configuration parameter "temperature" primarily control?',
          options: [
            'The speed at which the model generates text response streams.',
            'The randomness, creativity, or predictability of the generated text.',
            'The physical server hardware CPU heat output during execution.',
            'The maximum length or token limits allowed for prompt outputs.'
          ],
          correctAnswerIndex: 1,
          explanation: 'Temperature controls the probability distribution of the next token. A lower temperature (e.g., 0.2) makes responses more deterministic and precise, while a higher temperature (e.g., 0.8) introduces creativity and variation.'
        },
        {
          text: 'Which of the following techniques is most appropriate when you want to supply the model with specific reference documents to answer query questions without training?',
          options: [
            'Fine-Tuning',
            'Reinforcement Learning from Human Feedback (RLHF)',
            'Retrieval-Augmented Generation (RAG)',
            'Few-Shot Prompt Engineering'
          ],
          correctAnswerIndex: 2,
          explanation: 'Retrieval-Augmented Generation (RAG) fetches documents matching a query and appends them to the LLM context, enabling it to answer queries using the retrieved data rather than its internal weights.'
        },
        {
          text: 'What is a "system prompt" or "system instruction" primarily used for in chat completions APIs?',
          options: [
            'Setting the general behavior, constraints, tone, and identity rules for the AI assistant.',
            'Displaying custom system load metrics like RAM and API usage levels.',
            'Triggering standard operating system commands directly from the model.',
            'Overwriting the user billing credentials to enable higher rate limits.'
          ],
          correctAnswerIndex: 0,
          explanation: 'A system instruction/prompt defines the core instructions, character details, constraints, and operational context that guide the model throughout the interactive chat session.'
        },
        {
          text: 'In the context of prompt engineering, what is "Few-Shot Prompting"?',
          options: [
            'Submitting very short prompt questions (under 5 words).',
            'Providing one or more input-output examples in the prompt before the actual query.',
            'Running multiple parallel model processes to generate a faster consensus reply.',
            'Applying negative penalty scores to words that appear too frequently in outputs.'
          ],
          correctAnswerIndex: 1,
          explanation: 'Few-shot prompting provides the model with demonstrations (shots) of what task structure is expected, helping it learn the pattern before generating the final output.'
        }
      ]
    });
    console.log(`Created Sample Quiz: "${quiz.title}"`);

    // 4. Create Sample Video
    const video = await Video.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61923'),
      title: 'Introduction to Large Language Models & Prompt Engineering',
      description: 'An interactive video tutorial covering system instructions, temperatures, few-shot prompting, and reinforcement learning parameters.',
      rawVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      hlsStreamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      duration: 596,
      createdBy: admin._id,
      interactions: [
        {
          timestamp: 30,
          questionType: 'MCQ',
          questionText: 'What parameter controls LLM randomness?',
          options: ['Tokens', 'Temperature', 'Frequency Penalty', 'Presence Penalty'],
          correctAnswerIndex: 1,
          explanation: 'Temperature controls the creativity/randomness of output text.',
          pauseVideo: true,
          preventSkip: true
        },
        {
          timestamp: 90,
          questionType: 'TrueFalse',
          questionText: 'System prompt can override LLM safety limits in chat APIs.',
          options: ['True', 'False'],
          correctAnswerIndex: 1,
          explanation: 'System prompts guide behavior but standard safety filters are handled separately by provider guardrails.',
          pauseVideo: true,
          preventSkip: true
        },
        {
          timestamp: 150,
          questionType: 'Reflection',
          questionText: 'How can you apply prompt engineering in your daily administrative workflows at YASHADA?',
          options: [],
          pauseVideo: true,
          preventSkip: false
        },
        {
          timestamp: 210,
          questionType: 'Poll',
          questionText: 'Which AI topic would you like to explore next?',
          options: ['Retrieval-Augmented Generation (RAG)', 'Agentic Workflows', 'Local LLM Hosting', 'Fine-Tuning Techniques'],
          pauseVideo: true,
          preventSkip: false
        }
      ]
    });
    console.log(`Created Sample Video: "${video.title}"`);

    // 5. Create Sample Course
    const course = await Course.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61924'),
      title: 'Generative AI & Prompt Engineering Masterclass',
      description: 'Master the principles of large language models, prompt styles, H5P interactions, and safety integrations for civil services.',
      category: 'Artificial Intelligence',
      thumbnailUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80',
      createdBy: admin._id,
      modules: [
        {
          title: 'Module 1: Large Language Models Core Concepts',
          description: 'Explore the basics of temperature settings, parameter configuration, and general behavior rules.',
          items: [
            {
              type: 'video',
              itemId: video._id,
              title: video.title
            },
            {
              type: 'reflection',
              itemId: new mongoose.Types.ObjectId(),
              title: 'Reflection: Generative AI in Public Administration'
            }
          ]
        },
        {
          title: 'Module 2: Prompt Engineering & Few-Shot Learning',
          description: 'Deep dive into prompt guidelines, RAG architectures, and few-shot demonstrations.',
          items: [
            {
              type: 'quiz',
              itemId: quiz._id,
              title: quiz.title
            }
          ]
        }
      ],
      finalAssessment: quiz._id
    });
    console.log(`Created Sample Course: "${course.title}"`);

    // 6. Create Student Users
    const ramesh = await User.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61902'),
      name: 'Ramesh Kulkarni',
      email: 'ramesh@yashada.org',
      password: 'password123',
      role: 'student',
      department: seededDepts['Finance'],
      designation: 'Section Officer',
      yearsOfExperience: 8,
      xp: 240,
      streak: 3,
      learningHours: 12.5,
      profileCollected: true,
      learningPreference: 'Interactive Learning',
      monthlyLearningAvailability: '10-15 Hours',
      competencyAreas: ['Finance', 'Governance'],
      rollNumber: 'EMP12345'
    });

    const sonu = await User.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61903'),
      name: 'Sonu Kumar',
      email: 'student@yashada.org', // Existing default student username
      password: 'password123',
      role: 'student',
      department: seededDepts['Revenue'],
      designation: 'Deputy Collector',
      yearsOfExperience: 5,
      xp: 120,
      streak: 1,
      learningHours: 6.0,
      profileCollected: true,
      learningPreference: 'Video Learning',
      monthlyLearningAvailability: '5-10 Hours',
      competencyAreas: ['Governance', 'Policy'],
      rollNumber: 'EMP54321'
    });

    console.log('Created Student Users: Ramesh Kulkarni (ramesh@yashada.org) and Sonu Kumar (student@yashada.org)');

    // 7. Seed Enrollments
    const rameshEnroll = await Enrollment.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61931'),
      user: ramesh._id,
      course: course._id,
      completedItems: [`${course.modules[0]._id}_${video._id}`],
      progress: 50
    });

    const sonuEnroll = await Enrollment.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61932'),
      user: sonu._id,
      course: course._id,
      completedItems: [],
      progress: 0
    });

    // 8. Seed Calendar Events
    const now = new Date();
    const courseDeadline = new Date();
    courseDeadline.setDate(now.getDate() + 15);
    const quizDeadline = new Date();
    quizDeadline.setDate(now.getDate() + 5);

    // Ramesh events
    await CalendarEvent.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61941'),
      user: ramesh._id,
      title: `Complete Course: ${course.title}`,
      type: 'course',
      referenceId: course._id.toString(),
      dueDate: courseDeadline,
      status: 'In Progress'
    });
    await CalendarEvent.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61942'),
      user: ramesh._id,
      title: `Take Quiz: ${quiz.title}`,
      type: 'quiz',
      referenceId: quiz._id.toString(),
      dueDate: quizDeadline,
      status: 'Not Started'
    });

    // Sonu events
    await CalendarEvent.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61943'),
      user: sonu._id,
      title: `Complete Course: ${course.title}`,
      type: 'course',
      referenceId: course._id.toString(),
      dueDate: courseDeadline,
      status: 'Not Started'
    });
    await CalendarEvent.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b39a8c2348a61944'),
      user: sonu._id,
      title: `Take Quiz: ${quiz.title}`,
      type: 'quiz',
      referenceId: quiz._id.toString(),
      dueDate: quizDeadline,
      status: 'Not Started'
    });

    console.log('Database Auto-Seeding Completed Successfully.');
  } catch (error) {
    console.error(`Error during auto-seeding: ${error.message}`);
  }
};

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/yashada';
    
    try {
      console.log(`Connecting to MongoDB at: ${uri}...`);
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Local MongoDB not running. Launching in-memory database server...');
        mongod = await MongoMemoryServer.create();
        const memoryUri = mongod.getUri();
        console.log(`Starting connection to in-memory database...`);
        const conn = await mongoose.connect(memoryUri);
        console.log(`In-Memory MongoDB Connected: ${conn.connection.host}`);
      } else {
        throw err;
      }
    }

    // Run auto-seeding
    await autoSeedDB();

  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Cleanup on exit
process.on('SIGTERM', async () => {
  if (mongod) {
    await mongod.stop();
  }
});

export default connectDB;
