// MongoDB initialization script for ShikkhaSathi
// This script sets up collections and indexes

// Switch to the ShikkhaSathi database
db = db.getSiblingDB('shikkhasathi');

// Create collections with validation schemas

// Chat sessions collection
db.createCollection("chat_sessions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "session_id", "created_at"],
      properties: {
        user_id: { bsonType: "string" },
        session_id: { bsonType: "string" },
        subject: { bsonType: "string" },
        grade: { bsonType: "int" },
        messages: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["role", "content", "timestamp"],
            properties: {
              role: { enum: ["user", "assistant", "system"] },
              content: { bsonType: "string" },
              timestamp: { bsonType: "date" },
              metadata: { bsonType: "object" }
            }
          }
        },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});

// Documents collection for RAG system
db.createCollection("documents", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "content", "subject", "created_at"],
      properties: {
        title: { bsonType: "string" },
        content: { bsonType: "string" },
        subject: { bsonType: "string" },
        grade: { bsonType: "int" },
        topic: { bsonType: "string" },
        document_type: { enum: ["curriculum", "textbook", "reference", "exercise"] },
        source_file: { bsonType: "string" },
        metadata: { bsonType: "object" },
        embeddings: { bsonType: "array" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});

// Quiz attempts collection
db.createCollection("quiz_attempts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "quiz_id", "started_at"],
      properties: {
        user_id: { bsonType: "string" },
        quiz_id: { bsonType: "string" },
        subject: { bsonType: "string" },
        grade: { bsonType: "int" },
        questions: { bsonType: "array" },
        answers: { bsonType: "array" },
        score: { bsonType: "int" },
        total_questions: { bsonType: "int" },
        time_taken: { bsonType: "int" },
        started_at: { bsonType: "date" },
        completed_at: { bsonType: "date" }
      }
    }
  }
});

// Learning analytics collection
db.createCollection("learning_analytics", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "event_type", "timestamp"],
      properties: {
        user_id: { bsonType: "string" },
        event_type: { enum: ["quiz_start", "quiz_complete", "chat_message", "login", "logout", "assignment_submit"] },
        subject: { bsonType: "string" },
        grade: { bsonType: "int" },
        metadata: { bsonType: "object" },
        timestamp: { bsonType: "date" }
      }
    }
  }
});

// Notifications collection
db.createCollection("notifications", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "title", "message", "created_at"],
      properties: {
        user_id: { bsonType: "string" },
        title: { bsonType: "string" },
        message: { bsonType: "string" },
        type: { enum: ["info", "success", "warning", "error", "achievement"] },
        read: { bsonType: "bool" },
        metadata: { bsonType: "object" },
        created_at: { bsonType: "date" },
        read_at: { bsonType: "date" }
      }
    }
  }
});

// Create indexes for better performance

// Chat sessions indexes
db.chat_sessions.createIndex({ "user_id": 1 });
db.chat_sessions.createIndex({ "session_id": 1 });
db.chat_sessions.createIndex({ "created_at": -1 });
db.chat_sessions.createIndex({ "user_id": 1, "created_at": -1 });

// Documents indexes
db.documents.createIndex({ "subject": 1 });
db.documents.createIndex({ "grade": 1 });
db.documents.createIndex({ "topic": 1 });
db.documents.createIndex({ "document_type": 1 });
db.documents.createIndex({ "subject": 1, "grade": 1 });
db.documents.createIndex({ "content": "text", "title": "text" }); // Text search

// Quiz attempts indexes
db.quiz_attempts.createIndex({ "user_id": 1 });
db.quiz_attempts.createIndex({ "quiz_id": 1 });
db.quiz_attempts.createIndex({ "started_at": -1 });
db.quiz_attempts.createIndex({ "user_id": 1, "started_at": -1 });
db.quiz_attempts.createIndex({ "subject": 1, "grade": 1 });

// Learning analytics indexes
db.learning_analytics.createIndex({ "user_id": 1 });
db.learning_analytics.createIndex({ "event_type": 1 });
db.learning_analytics.createIndex({ "timestamp": -1 });
db.learning_analytics.createIndex({ "user_id": 1, "timestamp": -1 });
db.learning_analytics.createIndex({ "user_id": 1, "event_type": 1 });

// Notifications indexes
db.notifications.createIndex({ "user_id": 1 });
db.notifications.createIndex({ "read": 1 });
db.notifications.createIndex({ "created_at": -1 });
db.notifications.createIndex({ "user_id": 1, "read": 1, "created_at": -1 });

// Insert sample documents for testing
db.documents.insertMany([
  {
    title: "Introduction to Physics - Force and Motion",
    content: "Force is a push or pull that can change the motion of an object. Newton's laws of motion describe the relationship between forces and motion. The first law states that an object at rest stays at rest, and an object in motion stays in motion, unless acted upon by an external force.",
    subject: "Physics",
    grade: 8,
    topic: "Force and Motion",
    document_type: "curriculum",
    source_file: "physics_grade8_chapter1.pdf",
    metadata: {
      chapter: 1,
      section: "Introduction",
      curriculum_board: "NCTB"
    },
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    title: "Photosynthesis in Plants",
    content: "Photosynthesis is the process by which plants make their own food using sunlight, carbon dioxide, and water. This process occurs in the chloroplasts of plant cells and produces glucose and oxygen. The equation for photosynthesis is: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2",
    subject: "Biology",
    grade: 7,
    topic: "Plant Biology",
    document_type: "curriculum",
    source_file: "biology_grade7_chapter3.pdf",
    metadata: {
      chapter: 3,
      section: "Plant Processes",
      curriculum_board: "NCTB"
    },
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    title: "Basic Algebra - Linear Equations",
    content: "A linear equation is an equation that makes a straight line when graphed. It has the form y = mx + b, where m is the slope and b is the y-intercept. To solve linear equations, we use inverse operations to isolate the variable.",
    subject: "Mathematics",
    grade: 8,
    topic: "Algebra",
    document_type: "curriculum",
    source_file: "math_grade8_chapter4.pdf",
    metadata: {
      chapter: 4,
      section: "Linear Equations",
      curriculum_board: "NCTB"
    },
    created_at: new Date(),
    updated_at: new Date()
  }
]);

// Insert sample notifications
db.notifications.insertMany([
  {
    user_id: "student1",
    title: "Welcome to ShikkhaSathi!",
    message: "Start your learning journey with our AI tutor and interactive quizzes.",
    type: "info",
    read: false,
    created_at: new Date()
  },
  {
    user_id: "student1",
    title: "New Achievement Unlocked!",
    message: "You've earned the 'First Steps' achievement for completing your first quiz.",
    type: "achievement",
    read: false,
    metadata: {
      achievement_id: "first_steps",
      xp_earned: 50
    },
    created_at: new Date()
  }
]);

print("MongoDB initialization completed successfully!");
print("Collections created: chat_sessions, documents, quiz_attempts, learning_analytics, notifications");
print("Indexes created for optimal performance");
print("Sample data inserted for testing");