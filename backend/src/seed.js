import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Rubric from './models/Rubric.js';
import Quiz from './models/Quiz.js';
import connectDB from './config/db.js';

dotenv.config();

const seedData = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yashada');
    console.log('Connected to MongoDB for seeding...');

    // 1. Clear existing database collections
    await User.deleteMany();
    await Rubric.deleteMany();
    await Quiz.deleteMany();
    console.log('Cleared existing collections.');

    // 2. Create Default Admin
    const admin = await User.create({
      name: 'YASHADA Administrator',
      email: 'admin@yashada.org',
      password: 'adminpassword123', // Will be hashed by save hook in User model
      role: 'admin',
      activityLogs: [
        { action: 'Initial database seeding executed', ip: '127.0.0.1', timestamp: new Date() }
      ]
    });
    console.log('Created Admin User: admin@yashada.org / adminpassword123');

    // 3. Create Sample Rubric based on User's Screenshot
    const rubric = await Rubric.create({
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

    // 4. Create Sample Quiz
    const quiz = await Quiz.create({
      title: 'Generative AI & Prompt Engineering Assessment',
      description: 'Test your understanding of prompt styles, LLM settings, and safety principles for civil service integration.',
      category: 'Artificial Intelligence',
      timer: 5, // 5 minutes
      positiveMarks: 2,
      negativeMarks: 0.5, // negative marks enabled
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
          explanation: 'Few-shot prompting provides the model with demonstrations (shots) of what task structure is expected, helping it learn the target pattern before generating the final output.'
        }
      ]
    });
    console.log(`Created Sample Quiz: "${quiz.title}"`);

    console.log('Database Seeding Completed Successfully.');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
    process.exit(1);
  }
};

seedData();
