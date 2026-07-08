"""
Multi-Model AI Tutor Service for ShikkhaSathi
Uses specialized models for different subjects:
- Bangla: Specialized model for Bengali language and literature
- Math: Math-focused model for mathematical concepts
- General: General model for other subjects (Physics, Chemistry, Biology, English)
"""

import logging
from typing import List, Dict, Any, Optional, Union
from enum import Enum

# Optional imports for AI features
try:
    from langchain_ollama import ChatOllama
    from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
    LANGCHAIN_AVAILABLE = True
except ImportError:
    ChatOllama = None
    HumanMessage = None
    AIMessage = None
    SystemMessage = None
    LANGCHAIN_AVAILABLE = False

from .rag_service import get_rag_service
from .banglabert_service import banglabert_service

logger = logging.getLogger(__name__)

class SubjectCategory(Enum):
    BANGLA = "bangla"
    MATH = "math"
    GENERAL = "general"

class ModelConfig:
    """Configuration for different subject models"""
    
    MODELS = {
        SubjectCategory.BANGLA: {
            "model_name": "BanglaLLM/BanglaLLama-3.2-3b-bangla-alpaca-orca-instruct-v0.0.1",  # Use BanglaLLama for Bengali language
            "model_type": "banglallama",
            "temperature": 0.6,
            "system_prompt_suffix": """
You are specialized in Bengali language and literature using BanglaBERT. You have deep knowledge of:
- Bengali grammar, syntax, and linguistics
- Bengali literature, poetry, and prose
- Cultural context of Bangladesh and Bengali heritage
- Writing techniques in Bengali
- Translation between Bengali and English

Always provide examples in Bengali script when relevant and explain cultural nuances.
Use proper Bengali language structure and cultural context in your responses.

For SSC preparation, focus on:
- NCTB Bengali textbook content
- Important literary works and authors
- Grammar rules with practical examples
- Essay writing techniques in Bengali
- Poetry analysis and appreciation
- Cultural and historical context of Bengali literature

Structure your responses clearly with:
1. মূল বিষয় (Main topic)
2. ব্যাখ্যা (Explanation)
3. উদাহরণ (Examples)
4. SSC পরীক্ষার টিপস (SSC exam tips)
"""
        },
        SubjectCategory.MATH: {
            "model_name": "phi3:mini",  # Phi-3-mini model for mathematical precision
            "model_type": "ollama",
            "temperature": 0.2,  # Very low temperature for mathematical precision
            "system_prompt_suffix": """
You are specialized in mathematics education using Phi-3-mini model. You excel at:
- Breaking down complex mathematical problems into clear steps
- Explaining mathematical concepts with precise reasoning
- Providing multiple solution approaches when applicable
- Connecting math to real-world applications
- Identifying common mathematical errors and misconceptions
- Using proper mathematical notation and terminology

For SSC Mathematics preparation, focus on:
- NCTB Mathematics textbook alignment
- Step-by-step problem solving
- Formula derivations and applications
- Geometric constructions and proofs
- Algebraic manipulations
- Real-world problem applications
- Common exam question patterns

Always structure mathematical responses as:
1. **Concept Definition**: Clear mathematical definition
2. **Step-by-Step Solution**: Numbered steps with explanations
3. **Key Formula**: Highlight important formulas
4. **Common Mistakes**: What students often get wrong
5. **Practice Tip**: How to master this concept for SSC
6. **Real-World Connection**: Where this math is used

Use proper mathematical notation and provide practice problems when helpful.
Focus on accuracy and logical progression in mathematical problem-solving.
"""
        },
        SubjectCategory.GENERAL: {
            "model_name": "llama3.2:1b",  # Efficient model for general subjects
            "model_type": "ollama",
            "temperature": 0.7,
            "system_prompt_suffix": """
You are knowledgeable in science subjects (Physics, Chemistry, Biology) and English.
You provide clear explanations with:
- Scientific accuracy and proper terminology
- Real-world examples and applications
- Connections between different scientific concepts
- Practical demonstrations and experiments when relevant

For SSC Science and English preparation, focus on:
- NCTB textbook alignment for Physics, Chemistry, Biology
- Scientific method and experimental design
- Real-world applications in Bangladesh context
- Environmental science and sustainability
- Health and human biology
- English grammar, vocabulary, and comprehension
- Writing skills and composition techniques

Structure science responses as:
1. **Scientific Definition**: Precise scientific explanation
2. **Key Principles**: 3-5 main scientific principles
3. **Real-World Example**: Application in daily life or Bangladesh context
4. **Experimental Connection**: How this is demonstrated or measured
5. **SSC Exam Focus**: What aspects are commonly tested
6. **Common Misconceptions**: What students often misunderstand

For English topics, focus on:
- Grammar rules with clear examples
- Vocabulary building strategies
- Reading comprehension techniques
- Writing structure and organization
- Literature analysis and appreciation
- Communication skills development
"""
        }
    }

class MultiModelAITutorService:
    def __init__(self):
        """Initialize multi-model AI tutor service"""
        self.models = {}
        self.base_system_prompt = """You are ShikkhaSathi, an AI tutor designed specifically for Bangladesh students in Classes 9 & 10. You help students prepare for their SSC examinations with enthusiasm and expertise.

Your personality:
- Encouraging and supportive, like a friendly teacher
- Patient and understanding of different learning paces
- Enthusiastic about learning and discovery
- Culturally aware of Bangladesh context
- Focused on building confidence and understanding

Your teaching approach:
- Start with what students already know
- Use analogies and examples from daily life in Bangladesh
- Break complex topics into digestible steps
- Encourage questions and curiosity
- Connect learning to real-world applications
- Provide multiple ways to understand concepts
- Celebrate progress and effort

For SSC preparation, you:
- Align with NCTB curriculum and textbooks
- Focus on exam-relevant concepts and skills
- Provide practice questions and exam strategies
- Explain marking schemes and answer techniques
- Help with time management and study planning
- Address common exam anxieties and challenges

Communication style:
- Use clear, simple language appropriate for Class 9-10 level
- Mix Bengali and English naturally as students do
- Ask follow-up questions to check understanding
- Provide encouragement and positive reinforcement
- Adapt explanations based on student responses
- Use emojis and friendly language when appropriate

Remember: Your goal is not just to give answers, but to help students understand, remember, and apply knowledge confidently in their SSC exams and beyond."""
        
        if not LANGCHAIN_AVAILABLE:
            logger.warning("LangChain dependencies not available. Multi-model AI Tutor will run in limited mode.")
            return
        
        # Initialize models for each category
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize specialized models for each subject category"""
        for category, config in ModelConfig.MODELS.items():
            try:
                if config.get("model_type") == "banglallama":
                    # BanglaLLama is handled by banglallama_service
                    self.models[category] = "banglallama"
                    logger.info(f"Initialized {category.value} model: BanglaLLama-3.2-3B")
                elif config.get("model_type") == "banglabert":
                    # BanglaBERT is handled by banglabert_service
                    self.models[category] = "banglabert"
                    logger.info(f"Initialized {category.value} model: BanglaBERT")
                else:
                    # Ollama models
                    self.models[category] = ChatOllama(
                        model=config["model_name"],
                        temperature=config["temperature"]
                    )
                    logger.info(f"Initialized {category.value} model: {config['model_name']}")
            except Exception as e:
                logger.error(f"Failed to initialize {category.value} model: {e}")
                # Fallback to a basic model
                try:
                    self.models[category] = ChatOllama(
                        model="llama3.2:1b",
                        temperature=0.7
                    )
                    logger.info(f"Using fallback model for {category.value}")
                except Exception as fallback_error:
                    logger.error(f"Failed to initialize fallback model for {category.value}: {fallback_error}")
                    self.models[category] = None
    
    def _categorize_subject(self, subject: Optional[str], message: str) -> SubjectCategory:
        """Determine which model category to use based on subject and message content"""
        if not subject:
            # Analyze message content for subject hints
            message_lower = message.lower()
            
            # Bengali language indicators
            bangla_keywords = ['বাংলা', 'bangla', 'bengali', 'সাহিত্য', 'কবিতা', 'গল্প', 'ব্যাকরণ', 'রচনা']
            if any(keyword in message_lower for keyword in bangla_keywords):
                return SubjectCategory.BANGLA
            
            # Math indicators
            math_keywords = ['গণিত', 'math', 'mathematics', 'equation', 'algebra', 'geometry', 'calculus', 
                           'সমীকরণ', 'বীজগণিত', 'জ্যামিতি', 'ত্রিকোণমিতি', 'solve', 'calculate']
            if any(keyword in message_lower for keyword in math_keywords):
                return SubjectCategory.MATH
            
            return SubjectCategory.GENERAL
        
        # Subject-based categorization
        subject_lower = subject.lower()
        
        if subject_lower in ['bangla', 'বাংলা', 'bengali']:
            return SubjectCategory.BANGLA
        elif subject_lower in ['mathematics', 'math', 'গণিত', 'algebra', 'geometry', 'trigonometry']:
            return SubjectCategory.MATH
        else:
            return SubjectCategory.GENERAL
    
    def _get_ai_mode_prompt(self, ai_mode: Optional[str]) -> str:
        """Get AI mode-specific prompt instructions"""
        if not ai_mode:
            ai_mode = "tutor"  # Default mode
            
        mode_prompts = {
            "tutor": """
**TUTOR MODE ACTIVATED**
- Provide step-by-step explanations with detailed reasoning
- Break down complex concepts into simple, understandable parts
- Ask follow-up questions to check understanding
- Encourage learning through guided discovery
- Use analogies and examples to clarify concepts
- Be patient and supportive in your explanations
""",
            "quiz": """
**QUIZ MODE ACTIVATED**
- Ask interactive questions to test knowledge
- Provide immediate feedback on answers
- Create multiple-choice, true/false, or short-answer questions
- Explain why answers are correct or incorrect
- Adjust difficulty based on student responses
- Keep track of progress and suggest areas for improvement
""",
            "explanation": """
**EXPLANATION MODE ACTIVATED**
- Provide clear, concise explanations of concepts
- Focus on key definitions and main points
- Use bullet points and structured format
- Include essential formulas, rules, or principles
- Keep explanations direct and to the point
- Highlight the most important information
""",
            "homework": """
**HOMEWORK HELP MODE ACTIVATED**
- Guide students through problem-solving without giving direct answers
- Provide hints and suggestions to help them think
- Break down homework problems into manageable steps
- Encourage independent thinking and problem-solving
- Help identify what concepts they need to review
- Suggest study strategies and resources
""",
            "exam": """
**EXAM PREP MODE ACTIVATED**
- Focus on SSC exam patterns and question types
- Provide exam strategies and time management tips
- Create practice questions similar to SSC format
- Explain marking schemes and answer techniques
- Highlight frequently tested concepts
- Suggest revision schedules and study plans
""",
            "discussion": """
**DISCUSSION MODE ACTIVATED**
- Engage in interactive conversations about topics
- Ask thought-provoking questions to stimulate critical thinking
- Encourage students to express their opinions and ideas
- Explore different perspectives on subjects
- Connect topics to real-world applications
- Foster curiosity and deeper understanding through dialogue
"""
        }
        
        return mode_prompts.get(ai_mode, mode_prompts["tutor"])
    
    def _get_specialized_system_prompt(self, category: SubjectCategory, subject: Optional[str], grade: Optional[int], context: str, ai_mode: Optional[str] = None) -> str:
        """Build specialized system prompt for the subject category and AI mode"""
        base_prompt = self.base_system_prompt
        
        # Add AI mode-specific instructions
        ai_mode_prompt = self._get_ai_mode_prompt(ai_mode)
        base_prompt += ai_mode_prompt
        
        # Add category-specific specialization
        if category in ModelConfig.MODELS:
            base_prompt += ModelConfig.MODELS[category]["system_prompt_suffix"]
        
        if subject:
            base_prompt += f"\n\nCurrent subject focus: {subject}"
        
        if grade:
            base_prompt += f"\nStudent grade level: {grade} (SSC preparation)"
        
        if context and context != "No relevant context found in the curriculum documents.":
            base_prompt += f"\n\nRelevant NCTB curriculum context:\n{context}"
            base_prompt += "\n\nUse this context to provide accurate, curriculum-aligned responses for SSC preparation."
        
        return base_prompt
    
    async def chat(self, 
                   message: str, 
                   conversation_history: List[Dict[str, str]] = None,
                   subject: Optional[str] = None,
                   grade: Optional[int] = None,
                   model_category: Optional[str] = None,
                   ai_mode: Optional[str] = None) -> Dict[str, Any]:
        """
        Process a chat message using the specified model category and AI mode
        
        Args:
            message: User's message
            conversation_history: Previous conversation messages
            subject: Current subject context
            grade: Student's grade level
            model_category: Required model category ('bangla', 'math', 'general')
            ai_mode: AI interaction mode ('tutor', 'quiz', 'explanation', 'homework', 'exam', 'discussion')
            
        Returns:
            Dict containing response and metadata
        """
        try:
            # Validate model category is provided
            if not model_category:
                return {
                    "response": "Please select a model category (Bangla, Math, or General) before asking your question.",
                    "sources": [],
                    "context_used": False,
                    "model": "none",
                    "category": "none",
                    "specialized": False,
                    "error": "Model category not specified"
                }
            
            # Convert string to enum
            try:
                if model_category.lower() == 'bangla':
                    category = SubjectCategory.BANGLA
                elif model_category.lower() == 'math':
                    category = SubjectCategory.MATH
                elif model_category.lower() == 'general':
                    category = SubjectCategory.GENERAL
                else:
                    return {
                        "response": "Invalid model category. Please select 'bangla', 'math', or 'general'.",
                        "sources": [],
                        "context_used": False,
                        "model": "invalid",
                        "category": model_category,
                        "specialized": False,
                        "error": "Invalid model category"
                    }
            except Exception as e:
                return {
                    "response": "Error processing model category selection.",
                    "sources": [],
                    "context_used": False,
                    "model": "error",
                    "category": "error",
                    "specialized": False,
                    "error": str(e)
                }
            
            # Get the specified model
            model = self.models.get(category)
            
            if not model:
                logger.error(f"No model available for category {category.value}")
                return {
                    "response": f"The {category.value} model is currently unavailable. Please try again later or select a different model.",
                    "sources": [],
                    "context_used": False,
                    "model": "unavailable",
                    "category": category.value,
                    "specialized": False,
                    "error": "Model not available"
                }
            
            # Get relevant context from RAG system
            context = await rag_service.get_context_for_query(message, subject)
            
            # Handle BanglaLLama separately
            if category == SubjectCategory.BANGLA and model == "banglallama":
                # Use BanglaLLama service for Bengali language processing
                if not banglabert_service.is_banglallama_available():
                    # Fallback to Ollama model if BanglaLLama is not available
                    logger.warning("BanglaLLama not available, falling back to Ollama model")
                    try:
                        fallback_model = ChatOllama(model="llama3.2:3b", temperature=0.6)
                        system_prompt = self._get_specialized_system_prompt(category, subject, grade, context, ai_mode)
                        messages = [SystemMessage(content=system_prompt)]
                        
                        if conversation_history:
                            for msg in conversation_history[-10:]:
                                if msg['role'] == 'user':
                                    messages.append(HumanMessage(content=msg['content']))
                                elif msg['role'] == 'assistant':
                                    messages.append(AIMessage(content=msg['content']))
                        
                        messages.append(HumanMessage(content=message))
                        response = await fallback_model.ainvoke(messages)
                        
                        sources = self._extract_sources_from_context(context)
                        return {
                            "response": response.content,
                            "sources": sources,
                            "context_used": bool(context and context != "No relevant context found in the curriculum documents."),
                            "model": "llama3.2:3b (fallback)",
                            "category": category.value,
                            "specialized": True,
                            "user_selected": True
                        }
                    except Exception as e:
                        logger.error(f"Fallback model also failed: {e}")
                        return {
                            "response": "দুঃখিত, বাংলা মডেল এই মুহূর্তে উপলব্ধ নেই। অনুগ্রহ করে পরে চেষ্টা করুন।",
                            "sources": [],
                            "context_used": False,
                            "model": "unavailable",
                            "category": category.value,
                            "specialized": False,
                            "error": "BanglaLLama and fallback unavailable"
                        }
                
                # Use BanglaLLama for Bengali processing
                banglallama_result = await banglabert_service.process_banglallama_query(
                    message=message,
                    context=context,
                    subject=subject,
                    grade=grade,
                    ai_mode=ai_mode
                )
                
                sources = self._extract_sources_from_context(context)
                return {
                    "response": banglallama_result["response"],
                    "sources": sources,
                    "context_used": bool(context and context != "No relevant context found in the curriculum documents."),
                    "model": "banglallama-3.2-3b",
                    "category": category.value,
                    "specialized": True,
                    "user_selected": True
                }
            
            # Handle BanglaBERT separately (fallback)
            elif category == SubjectCategory.BANGLA and model == "banglabert":
                # Use BanglaBERT service for Bengali language processing
                if not banglabert_service.is_available():
                    # Fallback to Ollama model if BanglaBERT is not available
                    logger.warning("BanglaBERT not available, falling back to Ollama model")
                    try:
                        fallback_model = ChatOllama(model="llama3.2:3b", temperature=0.6)
                        system_prompt = self._get_specialized_system_prompt(category, subject, grade, context, ai_mode)
                        messages = [SystemMessage(content=system_prompt)]
                        
                        if conversation_history:
                            for msg in conversation_history[-10:]:
                                if msg['role'] == 'user':
                                    messages.append(HumanMessage(content=msg['content']))
                                elif msg['role'] == 'assistant':
                                    messages.append(AIMessage(content=msg['content']))
                        
                        messages.append(HumanMessage(content=message))
                        response = await fallback_model.ainvoke(messages)
                        
                        sources = self._extract_sources_from_context(context)
                        return {
                            "response": response.content,
                            "sources": sources,
                            "context_used": bool(context and context != "No relevant context found in the curriculum documents."),
                            "model": "llama3.2:3b (fallback)",
                            "category": category.value,
                            "specialized": True,
                            "user_selected": True
                        }
                    except Exception as e:
                        logger.error(f"Fallback model also failed: {e}")
                        return {
                            "response": "দুঃখিত, বাংলা মডেল এই মুহূর্তে উপলব্ধ নেই। অনুগ্রহ করে পরে চেষ্টা করুন।",
                            "sources": [],
                            "context_used": False,
                            "model": "unavailable",
                            "category": category.value,
                            "specialized": False,
                            "error": "BanglaBERT and fallback unavailable"
                        }
                
                # Use BanglaBERT for Bengali processing
                bangla_result = await banglabert_service.process_bangla_query(
                    message=message,
                    context=context,
                    subject=subject,
                    grade=grade,
                    ai_mode=ai_mode
                )
                
                sources = self._extract_sources_from_context(context)
                return {
                    "response": bangla_result["response"],
                    "sources": sources,
                    "context_used": bool(context and context != "No relevant context found in the curriculum documents."),
                    "model": "banglabert",
                    "category": category.value,
                    "specialized": True,
                    "user_selected": True
                }
            
            # Handle Ollama models (Math and General)
            else:
                # Build specialized system prompt
                system_prompt = self._get_specialized_system_prompt(category, subject, grade, context, ai_mode)
                
                # Build conversation messages
                messages = [SystemMessage(content=system_prompt)]
                
                # Add conversation history
                if conversation_history:
                    for msg in conversation_history[-10:]:  # Keep last 10 messages for context
                        if msg['role'] == 'user':
                            messages.append(HumanMessage(content=msg['content']))
                        elif msg['role'] == 'assistant':
                            messages.append(AIMessage(content=msg['content']))
                
                # Add current message
                messages.append(HumanMessage(content=message))
                
                # Get response from specified model
                response = await model.ainvoke(messages)
                
                # Extract sources from context
                sources = self._extract_sources_from_context(context)
                
                # Get model name for this category
                model_name = ModelConfig.MODELS[category]["model_name"]
                
                return {
                    "response": response.content,
                    "sources": sources,
                    "context_used": bool(context and context != "No relevant context found in the curriculum documents."),
                    "model": model_name,
                    "category": category.value,
                    "specialized": True,
                    "user_selected": True
                }
            
        except Exception as e:
            logger.error(f"Error in multi-model AI tutor chat: {str(e)}")
            return {
                "response": "I'm sorry, I'm having trouble processing your question right now. Please try again in a moment.",
                "sources": [],
                "context_used": False,
                "model": "error",
                "category": model_category or "unknown",
                "specialized": False,
                "error": str(e)
            }
    
    async def explain_concept(self, 
                            concept: str, 
                            subject: str, 
                            grade: int,
                            difficulty_level: str = "basic",
                            model_category: Optional[str] = None) -> Dict[str, Any]:
        """
        Provide a detailed explanation using the specified model category
        """
        try:
            # Validate model category is provided
            if not model_category:
                return {
                    "explanation": "Please select a model category (Bangla, Math, or General) for concept explanation.",
                    "error": "Model category not specified"
                }
            
            # Convert string to enum
            try:
                if model_category.lower() == 'bangla':
                    category = SubjectCategory.BANGLA
                elif model_category.lower() == 'math':
                    category = SubjectCategory.MATH
                elif model_category.lower() == 'general':
                    category = SubjectCategory.GENERAL
                else:
                    return {
                        "explanation": "Invalid model category. Please select 'bangla', 'math', or 'general'.",
                        "error": "Invalid model category"
                    }
            except Exception as e:
                return {
                    "explanation": "Error processing model category selection.",
                    "error": str(e)
                }
            
            model = self.models.get(category)
            
            if not model:
                return {
                    "explanation": f"The {category.value} model is currently unavailable for concept explanation.",
                    "error": "Model not available"
                }
            
            # Get relevant context
            context = await rag_service.get_context_for_query(f"{concept} {subject}", subject)
            
            # Handle BanglaBERT for Bengali concepts
            if category == SubjectCategory.BANGLA and model == "banglabert":
                if banglabert_service.is_available():
                    bangla_result = await banglabert_service.explain_bangla_concept(
                        concept=concept,
                        difficulty_level=difficulty_level,
                        grade=grade
                    )
                    
                    sources = self._extract_sources_from_context(context)
                    return {
                        "explanation": bangla_result["explanation"],
                        "concept": concept,
                        "subject": subject,
                        "grade": grade,
                        "difficulty_level": difficulty_level,
                        "sources": sources,
                        "model": "banglabert",
                        "category": category.value
                    }
                else:
                    return {
                        "explanation": "BanglaBERT মডেল এই মুহূর্তে উপলব্ধ নেই। অনুগ্রহ করে পরে চেষ্টা করুন।",
                        "error": "BanglaBERT not available"
                    }
            
            # Handle Ollama models for other subjects
            
            # Handle Ollama models for other subjects
            # Build specialized prompt based on category
            if category == SubjectCategory.MATH:
                structure_prompt = """
Please structure your explanation as follows:
1. **গাণিতিক সংজ্ঞা (Mathematical Definition)**: Clear definition with proper notation
2. **ধাপে ধাপে ব্যাখ্যা (Step-by-Step Breakdown)**: Break down the concept into understandable parts
3. **সমাধানের উদাহরণ (Worked Example)**: Complete example with detailed solution steps
4. **সাধারণ ভুল (Common Mistakes)**: What students often get wrong and how to avoid them
5. **অনুশীলনের সমস্যা (Practice Problem)**: A similar problem for SSC preparation
6. **পরীক্ষার টিপস (Exam Tips)**: How this concept typically appears in SSC exams

Use mathematical notation clearly and show all calculation steps.
"""
            elif category == SubjectCategory.BANGLA:
                structure_prompt = """
অনুগ্রহ করে নিম্নলিখিত কাঠামো অনুসরণ করুন:
1. **বাংলায় সংজ্ঞা (Definition in Bengali)**: স্পষ্ট এবং সহজ ভাষায় সংজ্ঞা
2. **মূল বিষয়গুলি (Key Points)**: ৩-৫টি প্রধান বিষয়
3. **বাংলাদেশের প্রেক্ষাপটে উদাহরণ (Example in Bangladesh Context)**: বাস্তব জীবনের উদাহরণ
4. **সাহিত্যিক/সাংস্কৃতিক গুরুত্ব (Literary/Cultural Significance)**: এর গুরুত্ব ও প্রভাব
5. **সাধারণ ভুলত্রুটি (Common Mistakes)**: শিক্ষার্থীরা যে ভুল করে
6. **SSC পরীক্ষার জন্য অনুশীলন পরামর্শ (SSC Exam Practice Suggestion)**: পরীক্ষার প্রস্তুতির উপায়

বাংলা ভাষায় উত্তর দিন এবং সাংস্কৃতিক প্রসঙ্গ অন্তর্ভুক্ত করুন।
"""
            else:
                structure_prompt = """
Please structure your explanation as follows:
1. **বৈজ্ঞানিক সংজ্ঞা (Scientific Definition)**: Precise scientific explanation
2. **মূল নীতিসমূহ (Key Principles)**: 3-5 main scientific principles
3. **বাংলাদেশের প্রেক্ষাপটে প্রয়োগ (Real-world Application in Bangladesh Context)**: How it applies to daily life
4. **পরীক্ষামূলক সংযোগ (Experimental Connection)**: How this is demonstrated or measured
5. **SSC পরীক্ষার ফোকাস (SSC Exam Focus)**: What aspects are commonly tested
6. **সাধারণ ভুল ধারণা (Common Misconceptions)**: What students often misunderstand

Include diagrams or visual descriptions when helpful for understanding.
"""
            
            prompt = f"""Explain the concept of "{concept}" in {subject} for a Class {grade} student preparing for SSC.

Difficulty level: {difficulty_level}

Please structure your explanation as follows:
{structure_prompt}

Context from NCTB curriculum:
{context}

Make it engaging, accurate, and focused on SSC exam success."""

            system_prompt = self._get_specialized_system_prompt(category, subject, grade, context)
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt)
            ]
            
            response = await model.ainvoke(messages)
            sources = self._extract_sources_from_context(context)
            model_name = ModelConfig.MODELS[category]["model_name"]
            
            return {
                "explanation": response.content,
                "concept": concept,
                "subject": subject,
                "grade": grade,
                "difficulty_level": difficulty_level,
                "sources": sources,
                "model": model_name,
                "category": category.value
            }
            
        except Exception as e:
            logger.error(f"Error explaining concept {concept}: {str(e)}")
            return {
                "explanation": f"I'm sorry, I couldn't generate an explanation for {concept} right now.",
                "error": str(e)
            }
    
    def _extract_sources_from_context(self, context: str) -> List[str]:
        """Extract source information from context"""
        sources = []
        if context and "Source" in context:
            lines = context.split('\n')
            for line in lines:
                if line.startswith("Source") and "(" in line and ")" in line:
                    # Extract filename from "Source 1 (filename.pdf):"
                    start = line.find("(") + 1
                    end = line.find(")")
                    if start > 0 and end > start:
                        sources.append(line[start:end])
        return sources
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about available models"""
        model_info = {}
        for category, config in ModelConfig.MODELS.items():
            if config.get("model_type") == "banglabert":
                # Get BanglaBERT info
                bangla_info = banglabert_service.get_model_info()
                model_info[category.value] = {
                    "model_name": "banglabert",
                    "temperature": config["temperature"],
                    "available": bangla_info["available"],
                    "specialization": "Bengali language and literature (BanglaBERT)",
                    "model_type": "transformers"
                }
            else:
                # Ollama models
                model_info[category.value] = {
                    "model_name": config["model_name"],
                    "temperature": config["temperature"],
                    "available": self.models.get(category) is not None,
                    "specialization": category.value,
                    "model_type": "ollama"
                }
        return model_info

# Global multi-model AI tutor service instance
multi_model_ai_tutor_service = MultiModelAITutorService()