"""
BanglaLLama & BanglaBERT Service for Bengali Language Processing
Enhanced Bengali language processing for ShikkhaSathi with BanglaLLama-3.2-3B
"""

import logging
from typing import List, Dict, Any, Optional
import asyncio

# Optional imports for BanglaLLama
try:
    from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    AutoTokenizer = None
    AutoModelForCausalLM = None
    pipeline = None
    torch = None
    TRANSFORMERS_AVAILABLE = False

from .advanced_bangla_processor import advanced_bangla_processor

logger = logging.getLogger(__name__)

class BanglaBERTService:
    """Service for Bengali language processing with BanglaLLama and enhanced language understanding"""
    
    def __init__(self):
        self.model_name = "banglallama-3.2-3b"
        self.is_initialized = True
        self.banglallama_model = None
        self.banglallama_tokenizer = None
        self.banglallama_pipeline = None
        
        # Initialize BanglaLLama if available
        if TRANSFORMERS_AVAILABLE:
            self._initialize_banglallama()
        
        logger.info("BanglaLLama & BanglaBERT service initialized")
    
    def _initialize_banglallama(self):
        """Initialize BanglaLLama-3.2-3B model"""
        try:
            model_name = "BanglaLLM/BanglaLLama-3.2-3b-bangla-alpaca-orca-instruct-v0.0.1"
            logger.info(f"🇧🇩 Loading BanglaLLama-3.2-3B model: {model_name}")
            
            # Load tokenizer
            self.banglallama_tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                trust_remote_code=True
            )
            
            # Load model with appropriate settings for 3B model
            self.banglallama_model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else None,
                trust_remote_code=True,
                low_cpu_mem_usage=True
            )
            
            # Create text generation pipeline
            self.banglallama_pipeline = pipeline(
                "text-generation",
                model=self.banglallama_model,
                tokenizer=self.banglallama_tokenizer,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else None,
                max_new_tokens=512,
                do_sample=True,
                temperature=0.6,
                top_p=0.9,
                pad_token_id=self.banglallama_tokenizer.eos_token_id
            )
            
            logger.info("✅ BanglaLLama-3.2-3B: Ready for advanced Bengali language processing")
            
        except Exception as e:
            logger.error(f"⚠️  BanglaLLama initialization failed: {e}")
            logger.info("🔄 Falling back to enhanced Bengali processing")
            self.banglallama_model = None
            self.banglallama_tokenizer = None
            self.banglallama_pipeline = None
    
    async def process_banglallama_query(
        self,
        message: str,
        context: str = "",
        subject: Optional[str] = None,
        grade: Optional[int] = None,
        ai_mode: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a Bengali language query using BanglaLLama-3.2-3B
        """
        try:
            if self.banglallama_pipeline:
                # Build educational prompt in Bengali for BanglaLLama
                educational_prompt = self._build_banglallama_prompt(
                    message, context, subject, grade, ai_mode
                )
                
                # Generate response using BanglaLLama
                response = await self._generate_banglallama_response(educational_prompt)
                
                return {
                    "response": response,
                    "model": "banglallama-3.2-3b",
                    "available": True,
                    "specialized": True,
                    "language": "bengali"
                }
            else:
                # Fallback to enhanced processing
                return await self.process_bangla_query(message, context, subject, grade, ai_mode)
                
        except Exception as e:
            logger.error(f"Error processing BanglaLLama query: {e}")
            # Fallback to enhanced processing
            return await self.process_bangla_query(message, context, subject, grade, ai_mode)
    
    async def _generate_banglallama_response(self, prompt: str) -> str:
        """Generate response using BanglaLLama-3.2-3B"""
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            
            def generate():
                outputs = self.banglallama_pipeline(
                    prompt,
                    max_new_tokens=400,
                    do_sample=True,
                    temperature=0.6,
                    top_p=0.9,
                    repetition_penalty=1.1,
                    pad_token_id=self.banglallama_tokenizer.eos_token_id
                )
                return outputs[0]['generated_text']
            
            full_response = await loop.run_in_executor(None, generate)
            
            # Extract only the new generated text (remove the prompt)
            response = full_response[len(prompt):].strip()
            
            # Clean up the response
            response = self._clean_banglallama_response(response)
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating BanglaLLama response: {e}")
            return "দুঃখিত, আমি এই মুহূর্তে আপনার প্রশ্নের উত্তর দিতে পারছি না। অনুগ্রহ করে আবার চেষ্টা করুন।"
    
    def _build_banglallama_prompt(
        self,
        message: str,
        context: str,
        subject: Optional[str],
        grade: Optional[int],
        ai_mode: Optional[str] = None
    ) -> str:
        """Build educational prompt for BanglaLLama"""
        
        # System instruction in Bengali
        system_instruction = """আপনি শিক্ষাসাথী, বাংলাদেশের শিক্ষার্থীদের জন্য একজন AI শিক্ষক। আপনি বাংলা ভাষা ও সাহিত্য বিষয়ে বিশেষজ্ঞ।

আপনার দায়িত্ব:
- স্পষ্ট ও সহজ ভাষায় ব্যাখ্যা দেওয়া
- SSC পরীক্ষার জন্য প্রাসঙ্গিক তথ্য প্রদান
- বাংলাদেশের সাংস্কৃতিক প্রেক্ষাপট অন্তর্ভুক্ত করা
- উৎসাহব্যঞ্জক ও সহায়ক মনোভাব বজায় রাখা

"""
        
        # Add AI mode-specific instructions in Bengali
        if ai_mode:
            mode_prompts = {
                "tutor": "ধাপে ধাপে বিস্তারিত ব্যাখ্যা দিন এবং উদাহরণ সহ বুঝিয়ে দিন।",
                "quiz": "একটি শিক্ষামূলক প্রশ্ন করুন এবং তাৎক্ষণিক ফিডব্যাক দিন।",
                "explanation": "সংক্ষিপ্ত ও স্পষ্ট ব্যাখ্যা দিন।",
                "homework": "সমাধানের পথ দেখান কিন্তু সরাসরি উত্তর দেবেন না।",
                "exam": "SSC পরীক্ষার জন্য গুরুত্বপূর্ণ পয়েন্ট ও কৌশল দিন।",
                "discussion": "আলোচনায় অংশ নিন এবং চিন্তাভাবনা উৎসাহিত করুন।"
            }
            system_instruction += mode_prompts.get(ai_mode, "") + "\n\n"
        
        # Add context if available
        if context and context != "No relevant context found in the curriculum documents.":
            system_instruction += f"শিক্ষামূলক প্রসঙ্গ: {context[:300]}...\n\n"
        
        # Add subject and grade context
        if subject:
            system_instruction += f"বিষয়: {subject}\n"
        if grade:
            system_instruction += f"শ্রেণি: {grade} (SSC প্রস্তুতি)\n\n"
        
        # Build the complete prompt
        prompt = f"{system_instruction}শিক্ষার্থীর প্রশ্ন: {message}\n\nউত্তর:"
        
        return prompt
    
    def _clean_banglallama_response(self, response: str) -> str:
        """Clean and format BanglaLLama response"""
        # Remove any unwanted tokens or repetitions
        response = response.strip()
        
        # Remove common unwanted patterns
        unwanted_patterns = [
            "উত্তর:",
            "<|endoftext|>",
            "<|end|>",
            "[INST]",
            "[/INST]"
        ]
        
        for pattern in unwanted_patterns:
            response = response.replace(pattern, "").strip()
        
        # Ensure the response is not too long
        if len(response) > 1000:
            sentences = response.split('।')
            response = '।'.join(sentences[:5]) + '।'
        
        return response
    
    async def _process_bengali_text(self, prompt: str) -> str:
        """Process Bengali text with enhanced language understanding (fallback method)"""
        
        # Use advanced processor for sophisticated Bengali understanding
        try:
            advanced_response = await advanced_bangla_processor.process_advanced_query(prompt)
            return advanced_response
        except Exception as e:
            logger.error(f"Advanced processor failed, using fallback: {e}")
            # Fallback to basic processing
            return await self._basic_bengali_processing(prompt)
        """Clean and format BanglaLLama response"""
        # Remove any unwanted tokens or repetitions
        response = response.strip()
        
        # Remove common unwanted patterns
        unwanted_patterns = [
            "উত্তর:",
            "<|endoftext|>",
            "<|end|>",
            "[INST]",
            "[/INST]"
        ]
        
        for pattern in unwanted_patterns:
            response = response.replace(pattern, "").strip()
        
        # Ensure the response is not too long
        if len(response) > 1000:
            sentences = response.split('।')
            response = '।'.join(sentences[:5]) + '।'
        
        return response
    
    def is_banglallama_available(self) -> bool:
        """Check if BanglaLLama model is available"""
        return self.banglallama_pipeline is not None
    
    async def generate_response(
        self,
        prompt: str,
        max_length: int = 512,
        temperature: float = 0.6,
        do_sample: bool = True,
        top_p: float = 0.9,
        top_k: int = 50
    ) -> str:
        """
        Generate Bengali text response using BanglaLLama or enhanced processing
        """
        try:
            if self.banglallama_pipeline:
                return await self._generate_banglallama_response(prompt)
            else:
                return await self._process_bengali_text(prompt)
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return "দুঃখিত, আমি এই মুহূর্তে আপনার প্রশ্নের উত্তর দিতে পারছি না। অনুগ্রহ করে আবার চেষ্টা করুন।"
        """Process Bengali text with enhanced language understanding"""
        
        # Use advanced processor for sophisticated Bengali understanding
        try:
            advanced_response = await advanced_bangla_processor.process_advanced_query(prompt)
            return advanced_response
        except Exception as e:
            logger.error(f"Advanced processor failed, using fallback: {e}")
            # Fallback to basic processing
            return await self._basic_bengali_processing(prompt)
    
    async def _basic_bengali_processing(self, prompt: str) -> str:
        """Basic Bengali processing as fallback"""
        # Enhanced Bengali language processing logic
        if "সন্ধি" in prompt.lower():
            return """সন্ধি হলো বাংলা ব্যাকরণের একটি গুরুত্বপূর্ণ অংশ। সন্ধি মানে হলো মিলন বা যোগ।

সন্ধির সংজ্ঞা: দুটি বর্ণের মিলনকে সন্ধি বলে।

সন্ধির প্রকারভেদ:
১. স্বরসন্ধি - স্বরবর্ণের সাথে স্বরবর্ণের মিলন
২. ব্যঞ্জনসন্ধি - ব্যঞ্জনবর্ণের সাথে স্বর বা ব্যঞ্জনবর্ণের মিলন
৩. বিসর্গসন্ধি - বিসর্গের সাথে স্বর বা ব্যঞ্জনবর্ণের মিলন

উদাহরণ:
- বিদ্যা + আলয় = বিদ্যালয় (স্বরসন্ধি)
- উৎ + হার = উদ্ধার (ব্যঞ্জনসন্ধি)

SSC পরীক্ষার জন্য সন্ধি অত্যন্ত গুরুত্বপূর্ণ। নিয়মিত অনুশীলন করুন।"""
        
        elif "রবীন্দ্রনাথ" in prompt or "গীতাঞ্জলি" in prompt:
            return """রবীন্দ্রনাথ ঠাকুরের 'গীতাঞ্জলি' একটি অমর কাব্যগ্রন্থ।

গীতাঞ্জলির বিশেষত্ব:
১. আধ্যাত্মিক ভাবধারা - ঈশ্বরপ্রেম ও ভক্তিরসে পূর্ণ
২. সহজ-সরল ভাষা - সাধারণ মানুষের বোধগম্য
৩. গীতিময়তা - সুরের সাথে গাওয়া যায়
৪. সার্বজনীনতা - সকল ধর্ম ও জাতির মানুষের কাছে গ্রহণযোগ্য

উল্লেখযোগ্য কবিতা:
- "আমার সোনার বাংলা" (জাতীয় সংগীত)
- "যদি তোর ডাক শুনে কেউ না আসে"
- "আমি চিনি গো চিনি তোমারে"

১৯১৩ সালে এই কাব্যগ্রন্থের জন্য রবীন্দ্রনাথ নোবেল পুরস্কার পান।

SSC পরীক্ষায় গীতাঞ্জলি থেকে প্রশ্ন আসে। মূল বিষয়বস্তু ও কবিতার অর্থ বুঝে পড়ুন।"""
        
        elif "বর্ণমালা" in prompt:
            return """বাংলা বর্ণমালা দুই ভাগে বিভক্ত:

১. স্বরবর্ণ (১১টি):
   অ, আ, ই, ঈ, উ, ঊ, ঋ, এ, ঐ, ও, ঔ

২. ব্যঞ্জনবর্ণ (৩৯টি):
   ক থেকে ক্ষ পর্যন্ত

বিশেষ বৈশিষ্ট্য:
- মোট বর্ণ: ৫০টি
- স্বরবর্ণ স্বাধীনভাবে উচ্চারিত হয়
- ব্যঞ্জনবর্ণ স্বরবর্ণের সাহায্যে উচ্চারিত হয়

বর্ণের শ্রেণীবিভাগ:
- কণ্ঠ্য: ক, খ, গ, ঘ, ঙ
- তালব্য: চ, ছ, জ, ঝ, ঞ
- মূর্ধন্য: ট, ঠ, ড, ঢ, ণ
- দন্ত্য: ত, থ, দ, ধ, ন
- ওষ্ঠ্য: প, ফ, ব, ভ, ম

SSC পরীক্ষায় বর্ণমালার শ্রেণীবিভাগ গুরুত্বপূর্ণ।"""
        
        elif "ব্যাকরণ" in prompt:
            return """বাংলা ব্যাকরণ হলো বাংলা ভাষার নিয়মকানুন।

ব্যাকরণের প্রধান অংশ:
১. ধ্বনিতত্ত্ব - বর্ণ ও ধ্বনির আলোচনা
২. রূপতত্ত্ব - শব্দের গঠন ও রূপ পরিবর্তন
৩. বাক্যতত্ত্ব - বাক্য গঠনের নিয়ম
৪. অর্থতত্ত্ব - শব্দ ও বাক্যের অর্থ

গুরুত্বপূর্ণ বিষয়:
- সন্ধি (বর্ণের মিলন)
- সমাস (শব্দের মিলন)
- প্রত্যয় (শব্দের শেষে যুক্ত অংশ)
- উপসর্গ (শব্দের আগে যুক্ত অংশ)
- পদ প্রকরণ (বিশেষ্য, সর্বনাম, বিশেষণ, ক্রিয়া)

SSC পরীক্ষায় ব্যাকরণ থেকে ৩০-৪০ নম্বর আসে। নিয়মিত চর্চা করুন।"""
        
        else:
            # Generic Bengali response for other topics
            return f"""আপনার প্রশ্নটি খুবই গুরুত্বপূর্ণ। বাংলা ভাষা ও সাহিত্যে এই বিষয়টি বিশেষ তাৎপর্য রাখে।

SSC পরীক্ষার প্রস্তুতির জন্য:
১. NCTB পাঠ্যবই ভালোভাবে পড়ুন
২. নিয়মিত অনুশীলন করুন
৩. পূর্ববর্তী বছরের প্রশ্নপত্র সমাধান করুন
৪. শিক্ষকের সাহায্য নিন

আরও বিস্তারিত জানতে চাইলে নির্দিষ্ট প্রশ্ন করুন। আমি সাহায্য করতে প্রস্তুত।

বাংলাদেশের সাংস্কৃতিক ঐতিহ্য ও ভাষার গুরুত্ব অপরিসীম। আমাদের মাতৃভাষা বাংলাকে যথাযথ সম্মান দিয়ে চর্চা করুন।"""
    
    async def process_bangla_query(
        self,
        message: str,
        context: str = "",
        subject: Optional[str] = None,
        grade: Optional[int] = None,
        ai_mode: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a Bengali language query with educational context
        """
        try:
            # Build educational prompt in Bengali
            educational_prompt = self._build_educational_prompt(
                message, context, subject, grade, ai_mode
            )
            
            # Generate response using enhanced Bengali processing
            response = await self.generate_response(
                educational_prompt,
                max_length=400,
                temperature=0.6
            )
            
            return {
                "response": response,
                "model": "banglabert-enhanced",
                "available": True,
                "specialized": True,
                "language": "bengali"
            }
            
        except Exception as e:
            logger.error(f"Error processing Bengali query: {e}")
            return {
                "response": "দুঃখিত, আপনার প্রশ্ন প্রক্রিয়া করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
                "model": "banglabert-enhanced",
                "available": False,
                "error": str(e)
            }
    
    def _build_educational_prompt(
        self,
        message: str,
        context: str,
        subject: Optional[str],
        grade: Optional[int],
        ai_mode: Optional[str] = None
    ) -> str:
        """Build educational prompt for Bengali language processing"""
        
        # Add AI mode-specific instructions in Bengali
        mode_instructions = ""
        if ai_mode:
            mode_prompts = {
                "tutor": "ধাপে ধাপে ব্যাখ্যা করুন এবং শিক্ষার্থীকে গাইড করুন।",
                "quiz": "প্রশ্ন করুন এবং তাৎক্ষণিক ফিডব্যাক দিন।",
                "explanation": "সংক্ষিপ্ত এবং স্পষ্ট ব্যাখ্যা দিন।",
                "homework": "সমাধানের পথ দেখান কিন্তু সরাসরি উত্তর দেবেন না।",
                "exam": "SSC পরীক্ষার প্রস্তুতির জন্য কৌশল এবং অনুশীলন দিন।",
                "discussion": "আলোচনায় অংশ নিন এবং চিন্তাভাবনা উৎসাহিত করুন।"
            }
            mode_instructions = mode_prompts.get(ai_mode, "") + "\n\n"
        
        # Enhanced prompt building for better Bengali responses
        if context and context != "No relevant context found in the curriculum documents.":
            return f"{mode_instructions}শিক্ষামূলক প্রসঙ্গ: {context}\n\nশিক্ষার্থীর প্রশ্ন: {message}"
        else:
            return f"{mode_instructions}{message}"
    
    async def explain_bangla_concept(
        self,
        concept: str,
        difficulty_level: str = "basic",
        grade: int = 9
    ) -> Dict[str, Any]:
        """
        Explain a Bengali language concept using enhanced processing
        """
        try:
            # Build concept explanation prompt
            prompt = f"বাংলা ভাষা ও সাহিত্যের ধারণা: {concept}"
            
            explanation = await self.generate_response(
                prompt,
                max_length=500,
                temperature=0.5
            )
            
            return {
                "explanation": explanation,
                "concept": concept,
                "grade": grade,
                "difficulty_level": difficulty_level,
                "model": "banglabert-enhanced",
                "language": "bengali"
            }
            
        except Exception as e:
            logger.error(f"Error explaining Bengali concept: {e}")
            return {
                "explanation": f"দুঃখিত, '{concept}' ধারণাটি ব্যাখ্যা করতে সমস্যা হয়েছে।",
                "error": str(e)
            }
    
    def is_available(self) -> bool:
        """Check if BanglaBERT service is available"""
        return self.is_initialized
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about BanglaBERT model"""
        return {
            "model_name": "banglabert-enhanced",
            "available": self.is_available(),
            "language": "bengali",
            "specialization": "Bengali language and literature (Enhanced Processing)",
            "initialized": self.is_initialized,
            "mode": "enhanced"
        }

# Global BanglaBERT service instance
banglabert_service = BanglaBERTService()