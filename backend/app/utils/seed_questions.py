"""
Seed script to populate the question bank with sample questions.
"""
from sqlalchemy.orm import Session
from app.models.question import Question
from app.db.session import SessionLocal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Sample questions for Mathematics
MATH_QUESTIONS = [
    {
        "question_text": "What is the value of x in the equation 2x + 5 = 15?",
        "question_text_bangla": "২x + ৫ = ১৫ সমীকরণে x এর মান কত?",
        "option_a": "5",
        "option_b": "10",
        "option_c": "7.5",
        "option_d": "2.5",
        "option_a_bangla": "৫",
        "option_b_bangla": "১০",
        "option_c_bangla": "৭.৫",
        "option_d_bangla": "২.৫",
        "correct_answer": "A",
        "explanation": "Subtract 5 from both sides: 2x = 10, then divide by 2: x = 5",
        "explanation_bangla": "উভয় পক্ষ থেকে ৫ বিয়োগ করুন: ২x = ১০, তারপর ২ দিয়ে ভাগ করুন: x = ৫",
        "subject": "Mathematics",
        "topic": "Linear Equations",
        "grade": 8,
        "difficulty_level": 2,
        "bloom_level": 3,
        "source": "NCTB",
        "chapter": "Algebra"
    },
    {
        "question_text": "What is the area of a rectangle with length 12 cm and width 8 cm?",
        "question_text_bangla": "১২ সেমি দৈর্ঘ্য এবং ৮ সেমি প্রস্থ বিশিষ্ট একটি আয়তক্ষেত্রের ক্ষেত্রফল কত?",
        "option_a": "20 cm²",
        "option_b": "40 cm²",
        "option_c": "96 cm²",
        "option_d": "100 cm²",
        "option_a_bangla": "২০ বর্গ সেমি",
        "option_b_bangla": "৪০ বর্গ সেমি",
        "option_c_bangla": "৯৬ বর্গ সেমি",
        "option_d_bangla": "১০০ বর্গ সেমি",
        "correct_answer": "C",
        "explanation": "Area of rectangle = length × width = 12 × 8 = 96 cm²",
        "explanation_bangla": "আয়তক্ষেত্রের ক্ষেত্রফল = দৈর্ঘ্য × প্রস্থ = ১২ × ৮ = ৯৬ বর্গ সেমি",
        "subject": "Mathematics",
        "topic": "Geometry",
        "grade": 7,
        "difficulty_level": 1,
        "bloom_level": 2,
        "source": "NCTB",
        "chapter": "Mensuration"
    },
    {
        "question_text": "Solve: (x + 3)² = 25",
        "question_text_bangla": "সমাধান করুন: (x + ৩)² = ২৫",
        "option_a": "x = 2 or x = -8",
        "option_b": "x = 5 or x = -5",
        "option_c": "x = 2 or x = 8",
        "option_d": "x = 3 or x = -3",
        "option_a_bangla": "x = ২ অথবা x = -৮",
        "option_b_bangla": "x = ৫ অথবা x = -৫",
        "option_c_bangla": "x = ২ অথবা x = ৮",
        "option_d_bangla": "x = ৩ অথবা x = -৩",
        "correct_answer": "A",
        "explanation": "Take square root: x + 3 = ±5, so x = 2 or x = -8",
        "explanation_bangla": "বর্গমূল নিন: x + ৩ = ±৫, সুতরাং x = ২ অথবা x = -৮",
        "subject": "Mathematics",
        "topic": "Quadratic Equations",
        "grade": 9,
        "difficulty_level": 3,
        "bloom_level": 3,
        "source": "NCTB",
        "chapter": "Algebra"
    },
    {
        "question_text": "What is the value of sin(30°)?",
        "question_text_bangla": "sin(৩০°) এর মান কত?",
        "option_a": "1/2",
        "option_b": "√3/2",
        "option_c": "1",
        "option_d": "√2/2",
        "option_a_bangla": "১/২",
        "option_b_bangla": "√৩/২",
        "option_c_bangla": "১",
        "option_d_bangla": "√২/২",
        "correct_answer": "A",
        "explanation": "sin(30°) = 1/2 is a standard trigonometric value",
        "explanation_bangla": "sin(৩০°) = ১/২ একটি প্রমাণ ত্রিকোণমিতিক মান",
        "subject": "Mathematics",
        "topic": "Trigonometry",
        "grade": 10,
        "difficulty_level": 2,
        "bloom_level": 1,
        "source": "NCTB",
        "chapter": "Trigonometry"
    },
    {
        "question_text": "If f(x) = 2x² + 3x - 5, what is f(2)?",
        "question_text_bangla": "যদি f(x) = ২x² + ৩x - ৫ হয়, তাহলে f(২) এর মান কত?",
        "option_a": "9",
        "option_b": "11",
        "option_c": "13",
        "option_d": "15",
        "option_a_bangla": "৯",
        "option_b_bangla": "১১",
        "option_c_bangla": "১৩",
        "option_d_bangla": "১৫",
        "correct_answer": "A",
        "explanation": "f(2) = 2(2)² + 3(2) - 5 = 8 + 6 - 5 = 9",
        "explanation_bangla": "f(২) = ২(২)² + ৩(২) - ৫ = ৮ + ৬ - ৫ = ৯",
        "subject": "Mathematics",
        "topic": "Functions",
        "grade": 9,
        "difficulty_level": 2,
        "bloom_level": 3,
        "source": "NCTB",
        "chapter": "Functions"
    }
]

# Sample questions for Physics
PHYSICS_QUESTIONS = [
    {
        "question_text": "What is the SI unit of force?",
        "question_text_bangla": "বলের SI একক কী?",
        "option_a": "Joule",
        "option_b": "Newton",
        "option_c": "Watt",
        "option_d": "Pascal",
        "option_a_bangla": "জুল",
        "option_b_bangla": "নিউটন",
        "option_c_bangla": "ওয়াট",
        "option_d_bangla": "প্যাসকেল",
        "correct_answer": "B",
        "explanation": "The SI unit of force is Newton (N), named after Isaac Newton",
        "explanation_bangla": "বলের SI একক নিউটন (N), আইজ্যাক নিউটনের নামানুসারে",
        "subject": "Physics",
        "topic": "Force and Motion",
        "grade": 9,
        "difficulty_level": 1,
        "bloom_level": 1,
        "source": "NCTB",
        "chapter": "Dynamics"
    },
    {
        "question_text": "A car accelerates from rest to 20 m/s in 5 seconds. What is its acceleration?",
        "question_text_bangla": "একটি গাড়ি স্থির অবস্থা থেকে ৫ সেকেন্ডে ২০ মি/সে বেগ প্রাপ্ত হয়। এর ত্বরণ কত?",
        "option_a": "2 m/s²",
        "option_b": "4 m/s²",
        "option_c": "5 m/s²",
        "option_d": "10 m/s²",
        "option_a_bangla": "২ মি/সে²",
        "option_b_bangla": "৪ মি/সে²",
        "option_c_bangla": "৫ মি/সে²",
        "option_d_bangla": "১০ মি/সে²",
        "correct_answer": "B",
        "explanation": "Acceleration = (final velocity - initial velocity) / time = (20 - 0) / 5 = 4 m/s²",
        "explanation_bangla": "ত্বরণ = (শেষ বেগ - প্রাথমিক বেগ) / সময় = (২০ - ০) / ৫ = ৪ মি/সে²",
        "subject": "Physics",
        "topic": "Motion",
        "grade": 9,
        "difficulty_level": 2,
        "bloom_level": 3,
        "source": "NCTB",
        "chapter": "Kinematics"
    },
    {
        "question_text": "What is the relationship between voltage, current, and resistance according to Ohm's Law?",
        "question_text_bangla": "ওহমের সূত্র অনুযায়ী ভোল্টেজ, কারেন্ট এবং রোধের মধ্যে সম্পর্ক কী?",
        "option_a": "V = I + R",
        "option_b": "V = I × R",
        "option_c": "V = I / R",
        "option_d": "V = R / I",
        "option_a_bangla": "V = I + R",
        "option_b_bangla": "V = I × R",
        "option_c_bangla": "V = I / R",
        "option_d_bangla": "V = R / I",
        "correct_answer": "B",
        "explanation": "Ohm's Law states that V = I × R, where V is voltage, I is current, and R is resistance",
        "explanation_bangla": "ওহমের সূত্র বলে V = I × R, যেখানে V ভোল্টেজ, I কারেন্ট এবং R রোধ",
        "subject": "Physics",
        "topic": "Electricity",
        "grade": 10,
        "difficulty_level": 2,
        "bloom_level": 2,
        "source": "NCTB",
        "chapter": "Current Electricity"
    }
]

# Sample questions for Chemistry
CHEMISTRY_QUESTIONS = [
    {
        "question_text": "What is the chemical formula for water?",
        "question_text_bangla": "পানির রাসায়নিক সংকেত কী?",
        "option_a": "H₂O",
        "option_b": "CO₂",
        "option_c": "O₂",
        "option_d": "H₂O₂",
        "option_a_bangla": "H₂O",
        "option_b_bangla": "CO₂",
        "option_c_bangla": "O₂",
        "option_d_bangla": "H₂O₂",
        "correct_answer": "A",
        "explanation": "Water consists of 2 hydrogen atoms and 1 oxygen atom, hence H₂O",
        "explanation_bangla": "পানি ২টি হাইড্রোজেন পরমাণু এবং ১টি অক্সিজেন পরমাণু নিয়ে গঠিত, তাই H₂O",
        "subject": "Chemistry",
        "topic": "Chemical Formulas",
        "grade": 8,
        "difficulty_level": 1,
        "bloom_level": 1,
        "source": "NCTB",
        "chapter": "Chemical Compounds"
    },
    {
        "question_text": "What type of bond is formed when electrons are shared between atoms?",
        "question_text_bangla": "পরমাণুর মধ্যে ইলেকট্রন ভাগাভাগি হলে কোন ধরনের বন্ধন তৈরি হয়?",
        "option_a": "Ionic bond",
        "option_b": "Covalent bond",
        "option_c": "Metallic bond",
        "option_d": "Hydrogen bond",
        "option_a_bangla": "আয়নিক বন্ধন",
        "option_b_bangla": "সমযোজী বন্ধন",
        "option_c_bangla": "ধাতব বন্ধন",
        "option_d_bangla": "হাইড্রোজেন বন্ধন",
        "correct_answer": "B",
        "explanation": "Covalent bonds form when atoms share electrons to achieve stability",
        "explanation_bangla": "সমযোজী বন্ধন তৈরি হয় যখন পরমাণু স্থিতিশীলতা অর্জনের জন্য ইলেকট্রন ভাগ করে",
        "subject": "Chemistry",
        "topic": "Chemical Bonding",
        "grade": 9,
        "difficulty_level": 2,
        "bloom_level": 2,
        "source": "NCTB",
        "chapter": "Chemical Bonding"
    }
]

# Sample questions for English
ENGLISH_QUESTIONS = [
    {
        "question_text": "Which of the following is a noun?",
        "question_text_bangla": "নিচের কোনটি বিশেষ্য?",
        "option_a": "Run",
        "option_b": "Beautiful",
        "option_c": "Happiness",
        "option_d": "Quickly",
        "option_a_bangla": "দৌড়ানো",
        "option_b_bangla": "সুন্দর",
        "option_c_bangla": "সুখ",
        "option_d_bangla": "দ্রুত",
        "correct_answer": "C",
        "explanation": "Happiness is a noun (a thing or concept). Run is a verb, Beautiful is an adjective, Quickly is an adverb",
        "explanation_bangla": "সুখ একটি বিশেষ্য (একটি জিনিস বা ধারণা)। দৌড়ানো একটি ক্রিয়া, সুন্দর একটি বিশেষণ, দ্রুত একটি ক্রিয়া বিশেষণ",
        "subject": "English",
        "topic": "Parts of Speech",
        "grade": 7,
        "difficulty_level": 1,
        "bloom_level": 1,
        "source": "NCTB",
        "chapter": "Grammar"
    },
    {
        "question_text": "Choose the correct sentence:",
        "question_text_bangla": "সঠিক বাক্যটি বেছে নিন:",
        "option_a": "She don't like apples",
        "option_b": "She doesn't likes apples",
        "option_c": "She doesn't like apples",
        "option_d": "She don't likes apples",
        "option_a_bangla": "She don't like apples",
        "option_b_bangla": "She doesn't likes apples",
        "option_c_bangla": "She doesn't like apples",
        "option_d_bangla": "She don't likes apples",
        "correct_answer": "C",
        "explanation": "With third person singular (she), use 'doesn't' and the base form of the verb",
        "explanation_bangla": "তৃতীয় পুরুষ একবচনের (she) সাথে 'doesn't' এবং ক্রিয়ার মূল রূপ ব্যবহার করুন",
        "subject": "English",
        "topic": "Subject-Verb Agreement",
        "grade": 8,
        "difficulty_level": 2,
        "bloom_level": 3,
        "source": "NCTB",
        "chapter": "Grammar"
    }
]

# Sample questions for Bangla
BANGLA_QUESTIONS = [
    {
        "question_text": "'সূর্য' শব্দের সমার্থক শব্দ কোনটি?",
        "question_text_bangla": "'সূর্য' শব্দের সমার্থক শব্দ কোনটি?",
        "option_a": "চন্দ্র",
        "option_b": "রবি",
        "option_c": "তারা",
        "option_d": "গ্রহ",
        "option_a_bangla": "চন্দ্র",
        "option_b_bangla": "রবি",
        "option_c_bangla": "তারা",
        "option_d_bangla": "গ্রহ",
        "correct_answer": "B",
        "explanation": "'রবি' হল 'সূর্য' শব্দের সমার্থক শব্দ",
        "explanation_bangla": "'রবি' হল 'সূর্য' শব্দের সমার্থক শব্দ",
        "subject": "Bangla",
        "topic": "Vocabulary",
        "grade": 7,
        "difficulty_level": 1,
        "bloom_level": 1,
        "source": "NCTB",
        "chapter": "শব্দার্থ"
    },
    {
        "question_text": "কোনটি যৌগিক বাক্য?",
        "question_text_bangla": "কোনটি যৌগিক বাক্য?",
        "option_a": "সে স্কুলে যায়",
        "option_b": "সে স্কুলে যায় এবং পড়াশোনা করে",
        "option_c": "যখন সে আসবে, আমি যাব",
        "option_d": "সে একজন ভালো ছাত্র",
        "option_a_bangla": "সে স্কুলে যায়",
        "option_b_bangla": "সে স্কুলে যায় এবং পড়াশোনা করে",
        "option_c_bangla": "যখন সে আসবে, আমি যাব",
        "option_d_bangla": "সে একজন ভালো ছাত্র",
        "correct_answer": "B",
        "explanation": "যৌগিক বাক্যে দুই বা ততোধিক সরল বাক্য সংযোজক দ্বারা যুক্ত থাকে",
        "explanation_bangla": "যৌগিক বাক্যে দুই বা ততোধিক সরল বাক্য সংযোজক দ্বারা যুক্ত থাকে",
        "subject": "Bangla",
        "topic": "Sentence Structure",
        "grade": 8,
        "difficulty_level": 2,
        "bloom_level": 2,
        "source": "NCTB",
        "chapter": "বাক্য"
    }
]


def seed_questions(db: Session):
    """Seed the database with sample questions"""
    all_questions = (
        MATH_QUESTIONS +
        PHYSICS_QUESTIONS +
        CHEMISTRY_QUESTIONS +
        ENGLISH_QUESTIONS +
        BANGLA_QUESTIONS
    )
    
    logger.info(f"Seeding {len(all_questions)} questions...")
    
    # Check if questions already exist
    existing_count = db.query(Question).count()
    if existing_count > 0:
        logger.warning(f"Database already has {existing_count} questions. Skipping seed.")
        return
    
    created_count = 0
    for q_data in all_questions:
        question = Question(**q_data)
        db.add(question)
        created_count += 1
    
    db.commit()
    logger.info(f"Successfully seeded {created_count} questions!")
    
    # Print summary
    subjects = db.query(Question.subject).distinct().all()
    for (subject,) in subjects:
        count = db.query(Question).filter(Question.subject == subject).count()
        logger.info(f"  - {subject}: {count} questions")


def main():
    """Main function to run the seed script"""
    db = SessionLocal()
    try:
        seed_questions(db)
    except Exception as e:
        logger.error(f"Error seeding questions: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
