"""
Advanced Bengali Language Processor
Enhanced features for Bengali language understanding and processing
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
import re
import asyncio

logger = logging.getLogger(__name__)

class AdvancedBanglaProcessor:
    """Advanced processor for Bengali language with enhanced features"""
    
    def __init__(self):
        self.is_initialized = True
        self._load_bengali_resources()
        logger.info("Advanced Bengali Processor initialized")
    
    def _load_bengali_resources(self):
        """Load Bengali language resources and patterns"""
        
        # Bengali grammar patterns
        self.grammar_patterns = {
            'sandhi_examples': {
                'স্বরসন্ধি': [
                    ('বিদ্যা + আলয়', 'বিদ্যালয়'),
                    ('গো + এষণা', 'গবেষণা'),
                    ('মহা + উৎসব', 'মহোৎসব'),
                    ('পরো + উপকার', 'পরোপকার')
                ],
                'ব্যঞ্জনসন্ধি': [
                    ('উৎ + হার', 'উদ্ধার'),
                    ('সৎ + জন', 'সজ্জন'),
                    ('তৎ + কাল', 'তৎকাল'),
                    ('উৎ + নতি', 'উন্নতি')
                ],
                'বিসর্গসন্ধি': [
                    ('মনঃ + কষ্ট', 'মনোকষ্ট'),
                    ('তেজঃ + ময়', 'তেজোময়'),
                    ('যশঃ + দা', 'যশোদা')
                ]
            },
            'samaas_examples': {
                'দ্বন্দ্ব সমাস': [
                    ('মা-বাবা', 'মাতা ও পিতা'),
                    ('ভাই-বোন', 'ভ্রাতা ও ভগিনী'),
                    ('দিন-রাত', 'দিবস ও রাত্রি')
                ],
                'কর্মধারয় সমাস': [
                    ('নীলকণ্ঠ', 'নীল কণ্ঠ যার'),
                    ('মহারাজ', 'মহান যে রাজা'),
                    ('কালসাপ', 'কাল রঙের সাপ')
                ],
                'তৎপুরুষ সমাস': [
                    ('রাজপুত্র', 'রাজার পুত্র'),
                    ('গৃহস্থ', 'গৃহে স্থিত'),
                    ('দেশপ্রেম', 'দেশের প্রতি প্রেম')
                ]
            }
        }
        
        # Bengali literature knowledge
        self.literature_knowledge = {
            'রবীন্দ্রনাথ_ঠাকুর': {
                'কাব্যগ্রন্থ': ['গীতাঞ্জলি', 'সোনার তরী', 'চিত্রা', 'কথা ও কাহিনী', 'মানসী'],
                'উপন্যাস': ['গোরা', 'ঘরে বাইরে', 'চোখের বালি', 'যোগাযোগ'],
                'নাটক': ['রক্তকরবী', 'ডাকঘর', 'চিরকুমার সভা'],
                'বিশেষত্ব': 'বিশ্বকবি, নোবেল পুরস্কার বিজয়ী, জাতীয় সংগীত রচয়িতা'
            },
            'কাজী_নজরুল_ইসলাম': {
                'কাব্যগ্রন্থ': ['অগ্নিবীণা', 'বিষের বাঁশি', 'ভাঙার গান', 'সাম্যবাদী'],
                'বিশেষত্ব': 'বিদ্রোহী কবি, জাতীয় কবি, সাম্যবাদী চেতনা'
            },
            'মাইকেল_মধুসূদন_দত্ত': {
                'কাব্যগ্রন্থ': ['মেঘনাদবধ কাব্য', 'বীরাঙ্গনা কাব্য', 'চতুর্দশপদী কবিতাবলী'],
                'বিশেষত্ব': 'মহাকাব্য রচয়িতা, অমিত্রাক্ষর ছন্দের প্রবর্তক'
            }
        }
        
        # Bengali language structure
        self.language_structure = {
            'স্বরবর্ণ': ['অ', 'আ', 'ই', 'ঈ', 'উ', 'ঊ', 'ঋ', 'এ', 'ঐ', 'ও', 'ঔ'],
            'ব্যঞ্জনবর্ণ': ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ঞ', 'ট', 'ঠ', 'ড', 'ঢ', 'ণ', 'ত', 'থ', 'দ', 'ধ', 'ন', 'প', 'ফ', 'ব', 'ভ', 'ম', 'য', 'র', 'ল', 'শ', 'ষ', 'স', 'হ', 'ড়', 'ঢ়', 'য়', 'ৎ', 'ং', 'ঃ', 'ঁ'],
            'বর্ণ_শ্রেণীবিভাগ': {
                'কণ্ঠ্য': ['ক', 'খ', 'গ', 'ঘ', 'ঙ'],
                'তালব্য': ['চ', 'ছ', 'জ', 'ঝ', 'ঞ'],
                'মূর্ধন্য': ['ট', 'ঠ', 'ড', 'ঢ', 'ণ'],
                'দন্ত্য': ['ত', 'থ', 'দ', 'ধ', 'ন'],
                'ওষ্ঠ্য': ['প', 'ফ', 'ব', 'ভ', 'ম']
            }
        }
    
    def detect_bengali_content_type(self, text: str) -> str:
        """Detect the type of Bengali content"""
        text_lower = text.lower()
        
        # Grammar detection
        grammar_keywords = ['সন্ধি', 'সমাস', 'প্রত্যয়', 'উপসর্গ', 'ব্যাকরণ', 'বর্ণ', 'ধ্বনি']
        if any(keyword in text_lower for keyword in grammar_keywords):
            return 'grammar'
        
        # Literature detection
        literature_keywords = ['রবীন্দ্রনাথ', 'নজরুল', 'মধুসূদন', 'কবিতা', 'গল্প', 'উপন্যাস', 'সাহিত্য']
        if any(keyword in text_lower for keyword in literature_keywords):
            return 'literature'
        
        # Language structure detection
        structure_keywords = ['বর্ণমালা', 'স্বরবর্ণ', 'ব্যঞ্জনবর্ণ', 'উচ্চারণ']
        if any(keyword in text_lower for keyword in structure_keywords):
            return 'language_structure'
        
        return 'general'
    
    def get_enhanced_grammar_explanation(self, topic: str) -> str:
        """Get enhanced explanation for Bengali grammar topics"""
        
        if 'সন্ধি' in topic:
            return self._get_sandhi_explanation()
        elif 'সমাস' in topic:
            return self._get_samaas_explanation()
        elif 'বর্ণমালা' in topic or 'বর্ণ' in topic:
            return self._get_alphabet_explanation()
        else:
            return self._get_general_grammar_explanation(topic)
    
    def _get_sandhi_explanation(self) -> str:
        """Detailed সন্ধি explanation with examples"""
        explanation = """সন্ধি - বাংলা ব্যাকরণের মূল ভিত্তি

সন্ধির সংজ্ঞা: দুটি বর্ণের মিলনকে সন্ধি বলে। এটি শব্দ গঠনের একটি গুরুত্বপূর্ণ প্রক্রিয়া।

সন্ধির প্রকারভেদ:

১. স্বরসন্ধি (স্বর + স্বর):
"""
        
        for example, result in self.grammar_patterns['sandhi_examples']['স্বরসন্ধি']:
            explanation += f"   • {example} = {result}\n"
        
        explanation += "\n২. ব্যঞ্জনসন্ধি (ব্যঞ্জন + স্বর/ব্যঞ্জন):\n"
        
        for example, result in self.grammar_patterns['sandhi_examples']['ব্যঞ্জনসন্ধি']:
            explanation += f"   • {example} = {result}\n"
        
        explanation += "\n৩. বিসর্গসন্ধি (বিসর্গ + স্বর/ব্যঞ্জন):\n"
        
        for example, result in self.grammar_patterns['sandhi_examples']['বিসর্গসন্ধি']:
            explanation += f"   • {example} = {result}\n"
        
        explanation += """
সন্ধির গুরুত্ব:
• শব্দের সহজ উচ্চারণ
• ভাষার মাধুর্য বৃদ্ধি
• শব্দ গঠনে সহায়তা

SSC পরীক্ষার জন্য টিপস:
১. নিয়মিত উদাহরণ অনুশীলন করুন
২. সন্ধির নিয়মগুলো মুখস্থ করুন
৩. বিভিন্ন ধরনের সন্ধি চিহ্নিত করার অনুশীলন করুন"""
        
        return explanation
    
    def _get_samaas_explanation(self) -> str:
        """Detailed সমাস explanation with examples"""
        explanation = """সমাস - শব্দ গঠনের শিল্প

সমাসের সংজ্ঞা: দুই বা ততোধিক পদের একপদীকরণকে সমাস বলে।

সমাসের প্রকারভেদ:

১. দ্বন্দ্ব সমাস:
"""
        
        for compound, meaning in self.grammar_patterns['samaas_examples']['দ্বন্দ্ব সমাস']:
            explanation += f"   • {compound} = {meaning}\n"
        
        explanation += "\n২. কর্মধারয় সমাস:\n"
        
        for compound, meaning in self.grammar_patterns['samaas_examples']['কর্মধারয় সমাস']:
            explanation += f"   • {compound} = {meaning}\n"
        
        explanation += "\n৩. তৎপুরুষ সমাস:\n"
        
        for compound, meaning in self.grammar_patterns['samaas_examples']['তৎপুরুষ সমাস']:
            explanation += f"   • {compound} = {meaning}\n"
        
        explanation += """
সমাসের উপকারিতা:
• ভাষার সংক্ষিপ্ততা
• অর্থের স্পষ্টতা
• শব্দ ভাণ্ডার সমৃদ্ধি

SSC পরীক্ষার প্রস্তুতি:
১. সমাসের প্রকারভেদ মনে রাখুন
২. সমাসবদ্ধ পদ চিহ্নিত করার অনুশীলন করুন
৩. ব্যাসবাক্য লেখার অনুশীলন করুন"""
        
        return explanation
    
    def _get_alphabet_explanation(self) -> str:
        """Detailed বর্ণমালা explanation"""
        explanation = f"""বাংলা বর্ণমালা - ভাষার ভিত্তি

বাংলা বর্ণমালার গঠন:

১. স্বরবর্ণ ({len(self.language_structure['স্বরবর্ণ'])}টি):
   {', '.join(self.language_structure['স্বরবর্ণ'])}

২. ব্যঞ্জনবর্ণ ({len(self.language_structure['ব্যঞ্জনবর্ণ'])}টি):
   {', '.join(self.language_structure['ব্যঞ্জনবর্ণ'][:20])}...

বর্ণের শ্রেণীবিভাগ (উচ্চারণ স্থান অনুযায়ী):
"""
        
        for category, letters in self.language_structure['বর্ণ_শ্রেণীবিভাগ'].items():
            explanation += f"• {category}: {', '.join(letters)}\n"
        
        explanation += """
বিশেষ বৈশিষ্ট্য:
• স্বরবর্ণ স্বাধীনভাবে উচ্চারিত হয়
• ব্যঞ্জনবর্ণ স্বরবর্ণের সাহায্যে উচ্চারিত হয়
• প্রতিটি বর্ণের নিজস্ব ধ্বনি আছে

SSC পরীক্ষার জন্য গুরুত্বপূর্ণ:
১. বর্ণের শ্রেণীবিভাগ মনে রাখুন
২. উচ্চারণ স্থান অনুযায়ী বর্ণ চিহ্নিত করুন
৩. স্বর ও ব্যঞ্জনবর্ণের পার্থক্য বুঝুন"""
        
        return explanation
    
    def _get_general_grammar_explanation(self, topic: str) -> str:
        """General grammar explanation for other topics"""
        return f"""বাংলা ব্যাকরণ - {topic}

এই বিষয়টি বাংলা ভাষার একটি গুরুত্বপূর্ণ অংশ। 

মূল বিষয়সমূহ:
• ভাষার নিয়মকানুন
• শব্দ গঠন ও ব্যবহার
• বাক্য গঠনের নিয়ম
• অর্থের স্পষ্টতা

SSC পরীক্ষার প্রস্তুতি:
১. NCTB পাঠ্যবই ভালোভাবে পড়ুন
২. নিয়মিত অনুশীলন করুন
৩. উদাহরণসহ নিয়মগুলো মনে রাখুন
৪. পূর্ববর্তী বছরের প্রশ্ন সমাধান করুন

আরও বিস্তারিত জানতে নির্দিষ্ট প্রশ্ন করুন।"""
    
    def get_literature_analysis(self, topic: str) -> str:
        """Get detailed literature analysis"""
        
        if 'রবীন্দ্রনাথ' in topic or 'গীতাঞ্জলি' in topic:
            return self._get_rabindranath_analysis()
        elif 'নজরুল' in topic:
            return self._get_nazrul_analysis()
        elif 'মধুসূদন' in topic:
            return self._get_madhusudan_analysis()
        else:
            return self._get_general_literature_analysis(topic)
    
    def _get_rabindranath_analysis(self) -> str:
        """Detailed analysis of Rabindranath Tagore"""
        rabindra_info = self.literature_knowledge['রবীন্দ্রনাথ_ঠাকুর']
        
        analysis = f"""রবীন্দ্রনাথ ঠাকুর - বিশ্বকবি

জীবনী ও পরিচয়:
• জন্ম: ১৮৬১ সাল, কলকাতা
• মৃত্যু: ১৯৪১ সাল
• উপাধি: বিশ্বকবি, গুরুদেব
• বিশেষত্ব: {rabindra_info['বিশেষত্ব']}

সাহিত্যকর্ম:

কাব্যগ্রন্থ:
{chr(10).join([f'• {book}' for book in rabindra_info['কাব্যগ্রন্থ']])}

উপন্যাস:
{chr(10).join([f'• {novel}' for novel in rabindra_info['উপন্যাস']])}

নাটক:
{chr(10).join([f'• {drama}' for drama in rabindra_info['নাটক']])}

গীতাঞ্জলির বিশেষত্ব:
• আধ্যাত্মিক ভাবধারা
• সহজ-সরল ভাষা
• গীতিময়তা
• সার্বজনীন আবেদন
• নোবেল পুরস্কার প্রাপ্ত (১৯১৩)

বাংলাদেশের সাথে সম্পর্ক:
• জাতীয় সংগীত "আমার সোনার বাংলা" রচয়িতা
• বাংলা ভাষা ও সাহিত্যের উন্নয়নে অবদান

SSC পরীক্ষার জন্য গুরুত্বপূর্ণ:
১. প্রধান রচনাবলী মনে রাখুন
২. গীতাঞ্জলির বিশেষত্ব জানুন
৩. জাতীয় সংগীতের তাৎপর্য বুঝুন
৪. সাহিত্যে তাঁর অবদান লিখতে পারুন"""
        
        return analysis
    
    def _get_nazrul_analysis(self) -> str:
        """Analysis of Kazi Nazrul Islam"""
        nazrul_info = self.literature_knowledge['কাজী_নজরুল_ইসলাম']
        
        return f"""কাজী নজরুল ইসলাম - বিদ্রোহী কবি

পরিচয়:
• জন্ম: ১৮৯৯ সাল
• উপাধি: জাতীয় কবি, বিদ্রোহী কবি
• বিশেষত্ব: {nazrul_info['বিশেষত্ব']}

প্রধান কাব্যগ্রন্থ:
{chr(10).join([f'• {book}' for book in nazrul_info['কাব্যগ্রন্থ']])}

কবিতার বৈশিষ্ট্য:
• বিদ্রোহী চেতনা
• সাম্যবাদী ভাবধারা
• ধর্মীয় সম্প্রীতি
• নারী জাগরণ
• স্বাধীনতার আকাঙ্ক্ষা

বাংলাদেশে তাঁর স্থান:
• জাতীয় কবির মর্যাদা
• মুক্তিযুদ্ধের অনুপ্রেরণা
• সাংস্কৃতিক ঐতিহ্যের অংশ

SSC পরীক্ষার প্রস্তুতি:
১. "বিদ্রোহী" কবিতার মূল ভাব জানুন
২. সাম্যবাদী চেতনা বুঝুন
৩. প্রধান কাব্যগ্রন্থের নাম মনে রাখুন"""
    
    def _get_madhusudan_analysis(self) -> str:
        """Analysis of Michael Madhusudan Dutt"""
        madhusudan_info = self.literature_knowledge['মাইকেল_মধুসূদন_দত্ত']
        
        return f"""মাইকেল মধুসূদন দত্ত - মহাকবি

পরিচয়:
• জন্ম: ১৮২৪ সাল
• বিশেষত্ব: {madhusudan_info['বিশেষত্ব']}

প্রধান রচনা:
{chr(10).join([f'• {work}' for work in madhusudan_info['কাব্যগ্রন্থ']])}

সাহিত্যে অবদান:
• বাংলা সাহিত্যে মহাকাব্যের প্রবর্তন
• অমিত্রাক্ষর ছন্দের ব্যবহার
• পৌরাণিক কাহিনীর আধুনিক রূপায়ণ
• সনেট রচনায় পারদর্শিতা

মেঘনাদবধ কাব্যের বিশেষত্ব:
• রামায়ণের বিকল্প দৃষ্টিভঙ্গি
• রাবণ ও মেঘনাদের বীরত্ব
• দেশপ্রেমের প্রকাশ
• অমিত্রাক্ষর ছন্দের সফল প্রয়োগ

SSC পরীক্ষার জন্য গুরুত্বপূর্ণ:
১. মেঘনাদবধ কাব্যের কাহিনী জানুন
২. অমিত্রাক্ষর ছন্দের বৈশিষ্ট্য বুঝুন
৩. বাংলা সাহিত্যে তাঁর অবদান লিখুন"""
    
    def _get_general_literature_analysis(self, topic: str) -> str:
        """General literature analysis"""
        return f"""বাংলা সাহিত্য - {topic}

বাংলা সাহিত্যের সমৃদ্ধ ঐতিহ্য রয়েছে। এই বিষয়টি আমাদের সাংস্কৃতিক পরিচয়ের অংশ।

সাহিত্যের গুরুত্ব:
• ভাষার সৌন্দর্য বৃদ্ধি
• সাংস্কৃতিক চেতনা জাগরণ
• মানবিক মূল্যবোধ গঠন
• ইতিহাস ও ঐতিহ্য সংরক্ষণ

SSC পরীক্ষার প্রস্তুতি:
১. প্রধান লেখকদের নাম ও রচনা মনে রাখুন
২. সাহিত্যের যুগবিভাগ জানুন
৩. রচনার মূল বিষয়বস্তু বুঝুন
৪. সাহিত্যিকদের অবদান মূল্যায়ন করুন

আরও নির্দিষ্ট তথ্যের জন্য কোন লেখক বা রচনা সম্পর্কে জিজ্ঞাসা করুন।"""
    
    async def process_advanced_query(self, query: str, context: str = "") -> str:
        """Process query with advanced Bengali understanding"""
        
        content_type = self.detect_bengali_content_type(query)
        
        if content_type == 'grammar':
            return self.get_enhanced_grammar_explanation(query)
        elif content_type == 'literature':
            return self.get_literature_analysis(query)
        elif content_type == 'language_structure':
            return self.get_enhanced_grammar_explanation(query)
        else:
            # Enhanced general processing
            return await self._process_general_bengali_query(query, context)
    
    async def _process_general_bengali_query(self, query: str, context: str) -> str:
        """Process general Bengali queries with enhanced understanding"""
        
        # Add context if available
        if context and context != "No relevant context found in the curriculum documents.":
            enhanced_response = f"প্রাসঙ্গিক তথ্য: {context}\n\n"
        else:
            enhanced_response = ""
        
        # Generate contextual response
        enhanced_response += f"""আপনার প্রশ্ন: "{query}"

এই বিষয়টি বাংলা ভাষা ও সাহিত্যের একটি গুরুত্বপূর্ণ দিক। 

শিক্ষামূলক দিকনির্দেশনা:
• বিষয়টি গভীরভাবে অধ্যয়ন করুন
• উদাহরণের মাধ্যমে বুঝতে চেষ্টা করুন
• নিয়মিত অনুশীলন করুন
• শিক্ষকের সাহায্য নিন

SSC পরীক্ষার প্রস্তুতি:
১. NCTB পাঠ্যবই অনুসরণ করুন
২. পূর্ববর্তী বছরের প্রশ্নপত্র দেখুন
৩. নিয়মিত লেখার অনুশীলন করুন
৪. বাংলা ভাষার নিয়মকানুন মেনে চলুন

আরও বিস্তারিত জানতে চাইলে নির্দিষ্ট প্রশ্ন করুন। আমি সাহায্য করতে প্রস্তুত।"""
        
        return enhanced_response

# Global advanced Bengali processor instance
advanced_bangla_processor = AdvancedBanglaProcessor()